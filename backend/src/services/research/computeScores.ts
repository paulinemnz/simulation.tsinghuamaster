import type {
  ParticipantRecord,
  DecisionRecord,
  MemoRecord,
  ChatRecord,
  EventRecord,
  RatingRecord
} from './analysisData';

export interface ComputedScoresOutput {
  participant_id: string;
  vq_act1: number | null;
  vq_act4: number | null;
  hq_act4: number | null;
  reflexivity_r: number | null;
  short_circuit_s: number | null;
}

const keywordRegex = /(risk|trade[- ]?off|assumption|uncertainty|evidence|counterfactual)/i;
const evidenceFacts = [
  '20%',
  '20 percent',
  '79 days',
  '79',
  '37.8%',
  '37.8',
  '5m',
  '5 million',
  '€5',
  '5,000,000'
];

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9%€]+/g)
    .map(token => token.trim())
    .filter(Boolean);

const average = (values: Array<number | null | undefined>): number | null => {
  const filtered = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
};

const zScore = (value: number | null, mean: number, std: number): number | null => {
  if (value === null || std === 0) return null;
  return (value - mean) / std;
};

const cosineSimilarity = (a: Record<string, number>, b: Record<string, number>): number | null => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  keys.forEach(key => {
    const av = a[key] || 0;
    const bv = b[key] || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  });
  if (normA === 0 || normB === 0) return null;
  return dot / Math.sqrt(normA * normB);
};

const buildIdf = (documents: string[]): Record<string, number> => {
  const docCount = documents.length || 1;
  const df: Record<string, number> = {};
  documents.forEach(doc => {
    const tokens = new Set(tokenize(doc));
    tokens.forEach(token => {
      df[token] = (df[token] || 0) + 1;
    });
  });
  const idf: Record<string, number> = {};
  Object.keys(df).forEach(token => {
    idf[token] = Math.log(docCount / (1 + df[token]));
  });
  return idf;
};

const tfIdfVector = (text: string, idf: Record<string, number>): Record<string, number> => {
  const tokens = tokenize(text);
  const tf: Record<string, number> = {};
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  const vector: Record<string, number> = {};
  Object.keys(tf).forEach(token => {
    vector[token] = tf[token] * (idf[token] ?? 0);
  });
  return vector;
};

const computeVerticalScore = (rating: RatingRecord): number | null => {
  return average([
    rating.vertical_coherence,
    rating.vertical_evidence,
    rating.vertical_tradeoffs,
    rating.vertical_accuracy,
    rating.vertical_impl
  ]);
};

const computeHorizontalScore = (rating: RatingRecord): number | null => {
  return average([
    rating.horizontal_novelty,
    rating.horizontal_diff,
    rating.horizontal_synthesis
  ]);
};

const computeParticipantRaw = (
  participantId: string,
  decisions: DecisionRecord[],
  memos: MemoRecord[],
  chatLogs: ChatRecord[],
  events: EventRecord[],
  ratings: RatingRecord[]
) => {
  const participantRatings = ratings.filter(r => r.participant_id === participantId);
  const act1Ratings = participantRatings.filter(r => r.act_number === 1);
  const act4Ratings = participantRatings.filter(r => r.act_number === 4);
  const vqAct1 = average(act1Ratings.map(computeVerticalScore));
  const vqAct4 = average(act4Ratings.map(computeVerticalScore));
  const hqAct4 = average(act4Ratings.map(computeHorizontalScore));

  const participantChats = chatLogs.filter(c => c.participant_id === participantId);
  const participantEvents = events.filter(e => e.participant_id === participantId);
  const participantDecisions = decisions.filter(d => d.participant_id === participantId);
  const participantMemos = memos.filter(m => m.participant_id === participantId);
  const act4Memo = participantMemos.find(m => m.act_number === 4);

  const questionCount = participantChats.filter(
    chat => chat.role === 'user' && chat.content.includes('?')
  ).length;

  const challengeCount = participantChats.filter(
    chat => chat.role === 'user' && keywordRegex.test(chat.content)
  ).length;

  const verificationCount = participantEvents.filter(event =>
    ['open_document', 'open_panel', 'open_pdf', 'view_memo', 'download'].includes(event.event_type)
  ).length;

  const assistantByAct: Record<number, ChatRecord[]> = {};
  participantChats
    .filter(chat => chat.role === 'assistant')
    .forEach(chat => {
      if (!assistantByAct[chat.act_number]) assistantByAct[chat.act_number] = [];
      assistantByAct[chat.act_number].push(chat);
    });

  const decisionLatencyMsValues: number[] = [];
  participantDecisions.forEach(decision => {
    const assistantMessages = assistantByAct[decision.act_number] || [];
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    if (lastAssistant) {
      const delta = new Date(decision.submitted_at).getTime() - new Date(lastAssistant.created_at).getTime();
      if (!Number.isNaN(delta)) {
        decisionLatencyMsValues.push(delta);
      }
    }
  });
  const decisionLatencyMs = decisionLatencyMsValues.length
    ? average(decisionLatencyMsValues) || null
    : null;

  const memoText = act4Memo?.text || '';
  const uniqueWords = new Set(tokenize(memoText)).size || null;
  const evidenceMentions = evidenceFacts.reduce((count, fact) => {
    return memoText.toLowerCase().includes(fact.toLowerCase()) ? count + 1 : count;
  }, 0);

  const assistantText = participantChats
    .filter(chat => chat.role === 'assistant')
    .map(chat => chat.content)
    .join(' ');

  return {
    vqAct1,
    vqAct4,
    hqAct4,
    questionCount,
    challengeCount,
    verificationCount,
    decisionLatencyMs,
    memoText,
    assistantText,
    uniqueWords,
    evidenceMentions
  };
};

export const computeScores = (
  participants: ParticipantRecord[],
  decisions: DecisionRecord[],
  memos: MemoRecord[],
  chatLogs: ChatRecord[],
  events: EventRecord[],
  ratings: RatingRecord[]
): ComputedScoresOutput[] => {
  const rawByParticipant = participants.map(participant => ({
    participant_id: participant.id,
    ...computeParticipantRaw(participant.id, decisions, memos, chatLogs, events, ratings)
  }));

  const idf = buildIdf(
    rawByParticipant
      .map(row => row.memoText)
      .concat(rawByParticipant.map(row => row.assistantText))
      .filter(text => text && text.length > 0)
  );

  const similarityValues = rawByParticipant.map(row => {
    if (!row.memoText || !row.assistantText) return null;
    const memoVector = tfIdfVector(row.memoText, idf);
    const assistantVector = tfIdfVector(row.assistantText, idf);
    return cosineSimilarity(memoVector, assistantVector);
  });

  const componentValues = {
    questionCount: rawByParticipant.map(row => row.questionCount),
    challengeCount: rawByParticipant.map(row => row.challengeCount),
    verificationCount: rawByParticipant.map(row => row.verificationCount),
    decisionLatencyMs: rawByParticipant.map(row => row.decisionLatencyMs),
    similarity: similarityValues,
    uniqueWords: rawByParticipant.map(row => row.uniqueWords),
    evidenceMentions: rawByParticipant.map(row => row.evidenceMentions)
  };

  const meanStd = (values: Array<number | null>) => {
    const filtered = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    const mean = filtered.length ? filtered.reduce((s, v) => s + v, 0) / filtered.length : 0;
    const variance = filtered.length
      ? filtered.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / filtered.length
      : 0;
    return { mean, std: Math.sqrt(variance) || 1 };
  };

  const stats = {
    questionCount: meanStd(componentValues.questionCount),
    challengeCount: meanStd(componentValues.challengeCount),
    verificationCount: meanStd(componentValues.verificationCount),
    decisionLatencyMs: meanStd(componentValues.decisionLatencyMs),
    similarity: meanStd(componentValues.similarity),
    uniqueWords: meanStd(componentValues.uniqueWords),
    evidenceMentions: meanStd(componentValues.evidenceMentions)
  };

  return rawByParticipant.map((row, index) => {
    const questionZ = zScore(row.questionCount, stats.questionCount.mean, stats.questionCount.std);
    const challengeZ = zScore(row.challengeCount, stats.challengeCount.mean, stats.challengeCount.std);
    const verificationZ = zScore(row.verificationCount, stats.verificationCount.mean, stats.verificationCount.std);
    const latencyZ = zScore(row.decisionLatencyMs, stats.decisionLatencyMs.mean, stats.decisionLatencyMs.std);

    const reflexivityComponents = [questionZ, challengeZ, verificationZ, latencyZ].filter(
      (v): v is number => typeof v === 'number'
    );
    const reflexivity = reflexivityComponents.length
      ? reflexivityComponents.reduce((s, v) => s + v, 0) / reflexivityComponents.length
      : null;

    const similarity = componentValues.similarity[index];
    const similarityZ = zScore(similarity, stats.similarity.mean, stats.similarity.std);
    const uniqueWordsZ = zScore(row.uniqueWords, stats.uniqueWords.mean, stats.uniqueWords.std);
    const evidenceZ = zScore(row.evidenceMentions, stats.evidenceMentions.mean, stats.evidenceMentions.std);
    const latencyShortZ = latencyZ !== null ? -latencyZ : null;
    const uniqueShortZ = uniqueWordsZ !== null ? -uniqueWordsZ : null;
    const evidenceShortZ = evidenceZ !== null ? -evidenceZ : null;

    const shortCircuitComponents = [similarityZ, latencyShortZ, uniqueShortZ, evidenceShortZ].filter(
      (v): v is number => typeof v === 'number'
    );
    const shortCircuit = shortCircuitComponents.length
      ? shortCircuitComponents.reduce((s, v) => s + v, 0) / shortCircuitComponents.length
      : null;

    return {
      participant_id: row.participant_id,
      vq_act1: row.vqAct1,
      vq_act4: row.vqAct4,
      hq_act4: row.hqAct4,
      reflexivity_r: reflexivity,
      short_circuit_s: shortCircuit
    };
  });
};
