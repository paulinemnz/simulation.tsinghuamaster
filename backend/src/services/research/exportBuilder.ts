import type { ParticipantRecord, DecisionRecord, MemoRecord, ChatRecord, EventRecord, RatingRecord, ComputedScoreRecord } from './analysisData';
import type { ComputedScoresOutput } from './computeScores';
import type { buildAnalytics } from './analyticsBuilder';

export const toCSV = (rows: any[]): string => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };
  return [headers.join(','), ...rows.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
};

export const buildMethodsMarkdown = (params: {
  analytics: ReturnType<typeof buildAnalytics>;
}) => {
  const { analytics } = params;
  return [
    '# Methods Appendix',
    '',
    '## Model Equations',
    `- H1a: ${analytics.hypotheses.h1a.equation}`,
    `- H1b: ${analytics.hypotheses.h1b.equation}`,
    `- H2: ${analytics.hypotheses.h2.equation}`,
    `- H3a: ${analytics.hypotheses.h3.equation.a}`,
    `- H3b: ${analytics.hypotheses.h3.equation.b}`,
    `- H4: ${'equation' in analytics.hypotheses.h4 ? analytics.hypotheses.h4.equation : analytics.hypotheses.h4.message}`,
    '',
    '## Variable Definitions',
    '- LLM: binary indicator for C1 condition',
    '- Agentic: binary indicator for C2 condition',
    '- VQ: vertical quality composite (average of vertical rubric items)',
    '- HQ: horizontal quality composite (average of horizontal rubric items)',
    '- R: AI reflexivity composite (z-scored behavioral indicators)',
    '- S: short-circuiting composite (z-scored similarity + speed indicators)',
    '',
    '## Rubric',
    '- Vertical: coherence, evidence, tradeoffs, accuracy, implementation',
    '- Horizontal: novelty, differentiation, synthesis'
  ].join('\n');
};
