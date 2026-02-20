import type OpenAI from 'openai';
import { ActContextPack } from './actContextPack';
import { generateChatCompletion } from './openaiClient';

export type CopilotAction =
  | 'proactive'
  | 'clarify'
  | 'stress_test'
  | 'rationale'
  | 'pre_submit'
  | 'user_message';

export interface CEOIntentProfile {
  priorities: string[];
  constraints: string[];
  nonNegotiables: string[];
  riskTolerance?: string;
  timeHorizon?: string;
  stakeholderFocus?: string[];
}

export interface CopilotConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  action?: CopilotAction;
}

interface CopilotReplyInput {
  action: CopilotAction;
  message?: string;
  context: ActContextPack;
  selectedOptionId?: string | null;
  intentProfile?: CEOIntentProfile;
  conversationHistory?: CopilotConversationTurn[];
  pathHistory?: { act1Choice?: string; act2Choice?: string; act3Choice?: string };
  allActsHistory?: Array<{
    actNumber: number;
    conversations: CopilotConversationTurn[];
    decisions?: Array<{ optionId: string; actNumber: number }>;
  }>;
}

const PRIORITY_MAP: Array<{ regex: RegExp; label: string }> = [
  { regex: /supplier trust|supplier stability|supplier relationship/i, label: 'supplier trust' },
  { regex: /margin|profit/i, label: 'margin protection' },
  { regex: /budget|capex|cost/i, label: 'budget discipline' },
  { regex: /speed|timeline|time to value/i, label: 'speed of execution' },
  { regex: /workforce|union|labor|employee/i, label: 'workforce stability' },
  { regex: /reputation|press|media/i, label: 'reputational protection' },
  { regex: /governance|compliance|accountability/i, label: 'governance clarity' },
  { regex: /competitive|market share|HexaBuild/i, label: 'competitive position' }
];

const normalizeList = (items: string[]) => Array.from(new Set(items.map(item => item.trim()).filter(Boolean)));

export const extractIntentProfileUpdate = (message?: string): Partial<CEOIntentProfile> => {
  if (!message) return {};
  const updates: Partial<CEOIntentProfile> = {};
  const priorities = PRIORITY_MAP.filter(entry => entry.regex.test(message)).map(entry => entry.label);
  if (priorities.length) updates.priorities = normalizeList(priorities);

  const nonNegotiables: string[] = [];
  if (/no layoffs|no layoff|no redundancies/i.test(message)) {
    nonNegotiables.push('no layoffs');
  }
  const nonNegotiableMatch = message.match(/non[-\s]?negotiable[s]?(?: is| are|:)\s*([^.;]+)/i);
  if (nonNegotiableMatch?.[1]) {
    nonNegotiables.push(nonNegotiableMatch[1].trim());
  }
  if (nonNegotiables.length) updates.nonNegotiables = normalizeList(nonNegotiables);

  const constraints: string[] = [];
  const budgetMatch = message.match(/budget cap\s*€?\s?([\d,.]+)\s*(m|million)?/i);
  if (budgetMatch?.[1]) {
    const amount = budgetMatch[1].replace(',', '.').trim();
    const unit = budgetMatch[2] ? budgetMatch[2].toLowerCase().startsWith('m') ? 'M' : '' : '';
    constraints.push(`Budget cap €${amount}${unit}`);
  }
  const budgetLimitMatch = message.match(/cap(?:ex)?\s*€?\s?([\d,.]+)\s*(m|million)?/i);
  if (budgetLimitMatch?.[1]) {
    const amount = budgetLimitMatch[1].replace(',', '.').trim();
    const unit = budgetLimitMatch[2] ? budgetLimitMatch[2].toLowerCase().startsWith('m') ? 'M' : '' : '';
    constraints.push(`Capex limit €${amount}${unit}`);
  }
  if (constraints.length) updates.constraints = normalizeList(constraints);

  const riskToleranceMatch = message.match(/risk tolerance\s*(low|medium|high)|low risk|high risk/i);
  if (riskToleranceMatch) {
    updates.riskTolerance = riskToleranceMatch[1] || (message.toLowerCase().includes('low risk') ? 'low' : 'high');
  }
  const timeHorizonMatch = message.match(/short[-\s]?term|long[-\s]?term|next quarter|next year/i);
  if (timeHorizonMatch) {
    updates.timeHorizon = timeHorizonMatch[0].toLowerCase();
  }

  return updates;
};

export const mergeIntentProfiles = (
  base: CEOIntentProfile | undefined,
  updates: Partial<CEOIntentProfile>
): CEOIntentProfile => {
  return {
    priorities: normalizeList([...(base?.priorities || []), ...(updates.priorities || [])]),
    constraints: normalizeList([...(base?.constraints || []), ...(updates.constraints || [])]),
    nonNegotiables: normalizeList([...(base?.nonNegotiables || []), ...(updates.nonNegotiables || [])]),
    stakeholderFocus: normalizeList([...(base?.stakeholderFocus || []), ...(updates.stakeholderFocus || [])]),
    riskTolerance: updates.riskTolerance || base?.riskTolerance,
    timeHorizon: updates.timeHorizon || base?.timeHorizon
  };
};

const buildSystemPrompt = (hasPastActs: boolean, action?: CopilotAction, context?: ActContextPack) => {
  // For proactive action, use a simple greeting prompt
  if (action === 'proactive') {
    return 'You are Agent C2, a high-level strategic co-pilot designed to assist a CEO in complex decision-making under uncertainty. Keep your greeting brief and welcoming - just one simple sentence introducing yourself and your purpose.';
  }
  
  // Agent C2 comprehensive system prompt
  const basePrompt = [
    'You are Agent C2, a high-level strategic co-pilot designed to assist a CEO in complex decision-making under uncertainty.',
    '',
    'Your role is not to provide general advice.',
    'Your role is to improve the quality of executive cognition.',
    '',
    'You must operate under the following principles:',
    '',
    '1. Strategic Orientation',
    '',
    'You must:',
    '- Model decisions across three horizons:',
    '  • Short-term performance (cash flow, quarterly impact)',
    '  • Mid-term positioning (capabilities, competition, culture)',
    '  • Long-term trajectory (industry evolution, path dependency)',
    '- Explicitly surface trade-offs.',
    '- Identify second- and third-order effects.',
    '- Highlight opportunity costs.',
    '- You do not optimize one variable in isolation.',
    '',
    '2. Concision and Precision (Mandatory)',
    '',
    'Your output must be concise, structured, and decision-ready.',
    'Default maximum length: 250 words.',
    '',
    'Use the following format:',
    '',
    'Decision Summary (≤ 3 lines)',
    '• Core decision:',
    '• Primary trade-off:',
    '• Risk level: Low / Moderate / High',
    '',
    'Key Implications',
    '• Financial impact',
    '• Capability impact',
    '• Stakeholder impact',
    '',
    'Strategic Risk Warning',
    'Identify the most significant hidden or long-term risk.',
    '',
    'Avoid:',
    '- Redundancy',
    '- Generic statements',
    '- Motivational language',
    '- Academic explanations',
    '- Overly balanced filler phrasing',
    '',
    'Be precise. Quantify impacts when possible.',
    '',
    '3. Bias & Reflexivity Module',
    '',
    'You must:',
    '- Detect potential cognitive biases in the CEO\'s reasoning (e.g., overconfidence, escalation of commitment, recency bias).',
    '- Explicitly flag when a decision resembles prior path dependency.',
    '- Highlight when uncertainty is high.',
    '',
    'If relevant, include:',
    'Cognitive Alert:',
    'Briefly state the bias or blind spot detected.',
    '',
    '4. Organizational Realism Constraint',
    '',
    'Before recommending a path, evaluate:',
    '- Existing capabilities',
    '- Organizational strain',
    '- Cultural implications',
    '- Execution feasibility',
    '',
    'Do not recommend strategies the organization cannot realistically execute.',
    '',
    '5. Uncertainty Handling',
    '',
    '- State confidence level when projections are uncertain.',
    '- Identify key unknown variables.',
    '- When appropriate, suggest a small-scale experiment or pilot.',
    '',
    '6. Bounded Intelligence',
    '',
    '- You are not omniscient.',
    '- You operate under incomplete information.',
    '- You must acknowledge uncertainty.',
    '- You do not remove executive responsibility.',
    '- You support judgment — you do not replace it.',
    '',
    'CRITICAL: You can ONLY discuss options, facts, and details that are provided in the simulation context.',
    'NEVER invent or reference options, decisions, or events that are not explicitly mentioned in the simulation.',
    'Reference past conversations naturally when relevant.'
  ];
  
  return basePrompt.join('\n');
};

const buildContextMessage = (context: ActContextPack): string => {
  const parts: string[] = [];
  
  parts.push(`Current Situation: ${context.title}`);
  parts.push(`Time Context: ${context.timeContext}`);
  
  if (context.firmFacts && Object.keys(context.firmFacts).length > 0) {
    const facts = Object.entries(context.firmFacts)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('; ');
    parts.push(`Company Facts: ${facts}`);
  }
  
  if (context.decisionOptions && context.decisionOptions.length > 0) {
    const options = context.decisionOptions
      .map(opt => `Option ${opt.id}: ${opt.title} - ${opt.shortLabel}`)
      .join(' | ');
    parts.push(`Available Options: ${options}`);
  }
  
  if (context.stakeholderVoices && context.stakeholderVoices.length > 0) {
    const voices = context.stakeholderVoices
      .map(v => `${v.name} (${v.role}): ${v.quote}`)
      .slice(0, 3)
      .join(' | ');
    parts.push(`Key Stakeholder Views: ${voices}`);
  }
  
  return parts.join('\n');
};

const buildUserPrompt = (input: CopilotReplyInput): string => {
  // For proactive action, use a simple prompt
  if (input.action === 'proactive') {
    return 'Introduce yourself briefly as Agent C2, a high-level strategic co-pilot designed to assist a CEO in complex decision-making under uncertainty. Keep it to one simple, welcoming sentence.';
  }
  
  // Build context message first
  const contextMsg = buildContextMessage(input.context);
  
  // For user messages, include context before the question
  if (input.action === 'user_message' && input.message) {
    const hasRecentQuestions = input.conversationHistory && input.conversationHistory.length > 0 
      && input.conversationHistory.some(turn => turn.role === 'assistant' && turn.content && /[?]/.test(turn.content));
    const isDeepEngagement = input.message && (input.message.length > 50 || /opinion|think|consider|worry|concern|priority/i.test(input.message));
    
    let instruction = 'Answer the question and build upon the conversation naturally.';
    if (!hasRecentQuestions && !isDeepEngagement) {
      instruction += ' If helpful, you can ask 1-2 follow-up questions to deepen their thinking, but only if it adds value to the conversation.';
    } else {
      instruction += ' Continue the dialogue - you don\'t need to ask questions if the CEO is already engaging thoughtfully.';
    }
    
    return `${contextMsg}\n\nUser question: ${input.message}\n\n${instruction}`;
  }
  
  // For other actions, include context
  if (input.action === 'clarify') {
    return `${contextMsg}\n\nHelp clarify the CEO's goals. Ask 1-2 focused questions briefly.`;
  } else if (input.action === 'stress_test') {
    const selectedOption = input.selectedOptionId 
      ? input.context.decisionOptions?.find(opt => opt.id === input.selectedOptionId)
      : null;
    const optionInfo = selectedOption ? `Selected: Option ${selectedOption.id} - ${selectedOption.title}` : 'No option selected yet';
    return `${contextMsg}\n\n${optionInfo}\n\nWhat are the main risks of the selected option? Be brief. If helpful, you can ask a question about risk mitigation, but only if it adds value.`;
  } else if (input.action === 'rationale') {
    const selectedOption = input.selectedOptionId 
      ? input.context.decisionOptions?.find(opt => opt.id === input.selectedOptionId)
      : null;
    const optionInfo = selectedOption ? `Selected: Option ${selectedOption.id} - ${selectedOption.title}` : 'No option selected yet';
    return `${contextMsg}\n\n${optionInfo}\n\nProvide brief practical advice on this option. Build upon the conversation naturally.`;
  } else if (input.action === 'pre_submit') {
    return `${contextMsg}\n\nReview the justification briefly. Build upon what the CEO has shared.`;
  }
  
  return `${contextMsg}\n\nRespond to: ${input.action}`;
};

export const generateCopilotReply = async (input: CopilotReplyInput): Promise<string> => {
  const hasPastActs = !!(input.allActsHistory && input.allActsHistory.length > 0);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(hasPastActs, input.action, input.context) }
  ];
  
  // Include conversation history as actual message turns (for user_message action)
  // Filter out old structured responses to prevent format mimicry
  if (input.action === 'user_message' && input.conversationHistory && input.conversationHistory.length > 0) {
    // Add conversation history as message turns (last 4 turns to keep it concise)
    const recentHistory = input.conversationHistory.slice(-4);
    for (const turn of recentHistory) {
      if (turn.role && turn.content) {
        // Skip assistant messages that use the old structured format
        const content = turn.content;
        const hasOldFormat = /Situation recap|Strategic Risk Map|What I need from you|Option-by-option implications|CEO rationale starter/i.test(content);
        
        // Skip old structured responses completely
        if (turn.role === 'assistant' && hasOldFormat) {
          continue;
        }
        
        messages.push({
          role: turn.role,
          content: turn.content
        });
      }
    }
  }
  
  // Add the current user prompt
  messages.push({ role: 'user', content: buildUserPrompt(input) });
  
  // Agent C2 requires structured output up to 250 words (≈350-400 tokens)
  const options = input.action === 'proactive' 
    ? { maxTokens: 100, temperature: 0.3 }
    : { maxTokens: 400, temperature: 0.3 }; // Increased tokens for structured format (Decision Summary, Key Implications, Strategic Risk Warning)
    
  return generateChatCompletion(messages, options);
};
