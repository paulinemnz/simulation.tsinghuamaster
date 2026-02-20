import { ScenarioConfig, CompanyState, DecisionCategory, OutcomeRule } from '../../shared/types/scenario.types';
import { DecisionData } from '../models/Decision';
import { OutcomeMetrics } from '../../shared/types/outcome';

export class SimulationEngine {
  private config: ScenarioConfig;
  private currentState: CompanyState;

  constructor(config: ScenarioConfig, initialState?: CompanyState) {
    this.config = config;
    this.currentState = initialState || { ...config.initialState };
  }

  /**
   * Process a decision and update the current state
   */
  processDecision(decision: DecisionData): void {
    const category = this.config.decisionCategories.find(c => c.id === decision.category_id);
    if (!category) {
      throw new Error(`Decision category ${decision.category_id} not found`);
    }

    // Apply decision values to state
    this.applyDecisionToState(category, decision.values);
  }

  /**
   * Calculate outcomes based on current state and outcome rules
   */
  calculateOutcomes(): OutcomeMetrics {
    const metrics: OutcomeMetrics = {
      financials: {
        revenue: this.currentState.financials.revenue,
        profit: this.currentState.financials.profit,
        cash: this.currentState.financials.cash,
        expenses: this.currentState.financials.expenses,
        roi: this.calculateROI(),
      },
      marketPosition: {
        marketShare: this.currentState.marketPosition.marketShare,
        brandValue: this.currentState.marketPosition.brandValue,
        customerSatisfaction: this.currentState.marketPosition.customerSatisfaction,
      },
      performance: {
        overallScore: this.calculateOverallScore(),
        growthRate: this.calculateGrowthRate(),
      },
    };

    // Apply outcome rules
    for (const rule of this.config.outcomeRules) {
      const result = this.applyOutcomeRule(rule);
      this.mergeMetrics(metrics, result);
    }

    return metrics;
  }

  /**
   * Get current state
   */
  getCurrentState(): CompanyState {
    return { ...this.currentState };
  }

  /**
   * Update state snapshot
   */
  updateState(updates: Partial<CompanyState>): void {
    this.currentState = {
      ...this.currentState,
      ...updates,
      financials: { ...this.currentState.financials, ...updates.financials },
      marketPosition: { ...this.currentState.marketPosition, ...updates.marketPosition },
      resources: { ...this.currentState.resources, ...updates.resources },
    };
  }

  /**
   * Apply decision values to state
   */
  private applyDecisionToState(category: DecisionCategory, values: Record<string, any>): void {
    switch (category.type) {
      case 'financial':
        this.applyFinancialDecision(values);
        break;
      case 'marketing':
        this.applyMarketingDecision(values);
        break;
      case 'operations':
        this.applyOperationsDecision(values);
        break;
      case 'hr':
        this.applyHRDecision(values);
        break;
      case 'strategy':
        this.applyStrategyDecision(values);
        break;
      default:
        // Custom decision types - apply generic updates
        this.updateState(values);
    }
  }

  private applyFinancialDecision(values: Record<string, any>): void {
    if (values.pricing !== undefined) {
      // Price changes affect revenue and market share
      const priceChange = (values.pricing - this.currentState.financials.revenue / 100) / 100;
      this.currentState.financials.revenue *= (1 + priceChange * 0.5);
      this.currentState.marketPosition.marketShare *= (1 - priceChange * 0.3);
    }

    if (values.budgetAllocation !== undefined) {
      // Budget allocation affects various areas
      const allocation = values.budgetAllocation;
      if (allocation.marketing) {
        this.currentState.marketPosition.brandValue += allocation.marketing * 0.1;
      }
      if (allocation.rd) {
        this.currentState.resources.technologyLevel += allocation.rd * 0.05;
      }
      if (allocation.operations) {
        this.currentState.resources.productionCapacity += allocation.operations * 0.08;
      }
      this.currentState.financials.cash -= (allocation.marketing || 0) + (allocation.rd || 0) + (allocation.operations || 0);
    }
  }

  private applyMarketingDecision(values: Record<string, any>): void {
    if (values.advertisingBudget !== undefined) {
      const impact = values.advertisingBudget * 0.15;
      this.currentState.marketPosition.brandValue += impact;
      this.currentState.marketPosition.marketShare += impact * 0.1;
      this.currentState.financials.expenses += values.advertisingBudget;
      this.currentState.financials.cash -= values.advertisingBudget;
    }

    if (values.promotions !== undefined) {
      this.currentState.marketPosition.customerSatisfaction += values.promotions * 0.2;
      this.currentState.financials.revenue *= (1 + values.promotions * 0.05);
    }
  }

  private applyOperationsDecision(values: Record<string, any>): void {
    if (values.productionLevel !== undefined) {
      const change = (values.productionLevel - this.currentState.resources.productionCapacity) / 100;
      this.currentState.resources.productionCapacity = values.productionLevel;
      this.currentState.financials.expenses += Math.abs(change) * 1000;
    }

    if (values.supplyChain !== undefined) {
      this.currentState.financials.expenses += values.supplyChain * 0.5;
      this.currentState.marketPosition.customerSatisfaction += values.supplyChain * 0.1;
    }
  }

  private applyHRDecision(values: Record<string, any>): void {
    if (values.hiring !== undefined) {
      this.currentState.resources.employees += values.hiring;
      this.currentState.financials.expenses += values.hiring * 50000; // Cost per employee
      this.currentState.resources.productionCapacity += values.hiring * 0.1;
    }

    if (values.training !== undefined) {
      this.currentState.resources.technologyLevel += values.training * 0.1;
      this.currentState.financials.expenses += values.training;
    }
  }

  private applyStrategyDecision(values: Record<string, any>): void {
    if (values.marketEntry !== undefined) {
      this.currentState.marketPosition.marketShare += values.marketEntry * 0.2;
      this.currentState.financials.cash -= values.marketEntry * 100000;
    }

    if (values.partnerships !== undefined) {
      this.currentState.marketPosition.brandValue += values.partnerships * 0.15;
      this.currentState.resources.technologyLevel += values.partnerships * 0.1;
    }
  }

  private applyOutcomeRule(rule: OutcomeRule): Partial<OutcomeMetrics> {
    // Simple rule evaluation - in production, this would use a more sophisticated formula parser
    try {
      // For now, return empty object - can be extended with formula evaluation
      return {};
    } catch (error) {
      console.error(`Error applying outcome rule ${rule.id}:`, error);
      return {};
    }
  }

  private calculateROI(): number {
    const investment = this.currentState.financials.expenses;
    const profit = this.currentState.financials.profit;
    return investment > 0 ? (profit / investment) * 100 : 0;
  }

  private calculateOverallScore(): number {
    const financialScore = (this.currentState.financials.profit / 1000000) * 30;
    const marketScore = this.currentState.marketPosition.marketShare * 30;
    const satisfactionScore = this.currentState.marketPosition.customerSatisfaction * 20;
    const growthScore = this.calculateGrowthRate() * 20;

    return Math.max(0, Math.min(100, financialScore + marketScore + satisfactionScore + growthScore));
  }

  private calculateGrowthRate(): number {
    const revenue = this.currentState.financials.revenue;
    const expenses = this.currentState.financials.expenses;
    return expenses > 0 ? ((revenue - expenses) / expenses) * 100 : 0;
  }

  private mergeMetrics(target: OutcomeMetrics, source: Partial<OutcomeMetrics>): void {
    Object.keys(source).forEach(key => {
      if (typeof source[key as keyof OutcomeMetrics] === 'object' && !Array.isArray(source[key as keyof OutcomeMetrics])) {
        target[key as keyof OutcomeMetrics] = {
          ...target[key as keyof OutcomeMetrics],
          ...source[key as keyof OutcomeMetrics],
        } as any;
      } else {
        target[key as keyof OutcomeMetrics] = source[key as keyof OutcomeMetrics] as any;
      }
    });
  }
}