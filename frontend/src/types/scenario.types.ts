export interface Scenario {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  config: ScenarioConfig;
  isActive: boolean;
}

export interface ScenarioConfig {
  initialState: CompanyState;
  decisionCategories: DecisionCategory[];
  outcomeRules: OutcomeRule[];
  marketDynamics?: MarketDynamics;
  rounds: number;
  roundDuration?: number; // in minutes
}

export interface CompanyState {
  financials: Financials;
  marketPosition: MarketPosition;
  resources: Resources;
  [key: string]: any; // Allow additional custom state
}

export interface Financials {
  revenue: number;
  profit: number;
  cash: number;
  expenses: number;
  debt?: number;
  equity?: number;
}

export interface MarketPosition {
  marketShare: number;
  brandValue: number;
  customerSatisfaction: number;
  competitiveRank?: number;
}

export interface Resources {
  employees: number;
  productionCapacity: number;
  technologyLevel: number;
  [key: string]: any;
}

export interface DecisionCategory {
  id: string;
  name: string;
  type: DecisionType;
  options: DecisionOption[];
  constraints?: Constraint[];
  description?: string;
}

export type DecisionType = 
  | 'financial' 
  | 'marketing' 
  | 'operations' 
  | 'hr' 
  | 'strategy' 
  | 'custom';

export interface DecisionOption {
  id: string;
  label: string;
  value: any;
  description?: string;
  cost?: number;
  impact?: ImpactEstimate;
}

export interface ImpactEstimate {
  revenue?: number;
  cost?: number;
  marketShare?: number;
  [key: string]: any;
}

export interface Constraint {
  type: 'min' | 'max' | 'required' | 'conditional';
  field: string;
  value?: any;
  condition?: string;
  message?: string;
}

export interface OutcomeRule {
  id: string;
  name: string;
  formula: string; // Can be a function or expression
  dependencies: string[]; // Decision IDs or state fields
  description?: string;
}

export interface MarketDynamics {
  competitors?: Competitor[];
  marketTrends?: MarketTrend[];
  externalFactors?: ExternalFactor[];
}

export interface Competitor {
  id: string;
  name: string;
  marketShare: number;
  strategy?: string;
}

export interface MarketTrend {
  period: number;
  type: 'growth' | 'decline' | 'stable';
  magnitude: number;
  affects: string[]; // Which metrics are affected
}

export interface ExternalFactor {
  id: string;
  name: string;
  probability: number; // 0-1
  impact: Record<string, number>;
  description?: string;
}
