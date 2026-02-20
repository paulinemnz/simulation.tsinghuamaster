import { DecisionCategory, DecisionType } from './scenario.types';

export interface Decision {
  id: string;
  participantId: string;
  scenarioId: string;
  round: number;
  categoryId: string;
  categoryType: DecisionType;
  values: Record<string, any>;
  submittedAt: string;
  timeSpent?: number; // in milliseconds
  intermediateChanges?: number; // count of changes before final submission
}

export interface DecisionSubmission {
  categoryId: string;
  values: Record<string, any>;
  round: number;
}

export interface DecisionEvent {
  id: string;
  decisionId: string;
  type: 'created' | 'modified' | 'submitted' | 'reverted';
  timestamp: string;
  values?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DecisionTiming {
  decisionId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  pauses?: PauseEvent[];
}

export interface PauseEvent {
  start: string;
  end?: string;
  duration?: number;
}
