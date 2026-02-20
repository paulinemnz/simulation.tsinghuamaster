export interface OutcomeMetrics {
  financials: {
    revenue: number;
    profit: number;
    cash: number;
    expenses: number;
    roi?: number;
  };
  marketPosition: {
    marketShare: number;
    brandValue: number;
    customerSatisfaction: number;
  };
  performance: {
    overallScore?: number;
    ranking?: number;
    growthRate?: number;
  };
  [key: string]: any; // Allow custom metrics
}

export interface Outcome {
  id: string;
  participantId: string;
  scenarioId: string;
  round: number;
  metrics: OutcomeMetrics;
  calculatedAt: string;
  stateSnapshot: Record<string, any>;
}
