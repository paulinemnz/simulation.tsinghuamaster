import { SimulationEngine } from './simulationEngine';
import { ScenarioConfig } from '../../shared/types/scenario.types';
import { DecisionData } from '../models/Decision';
import { OutcomeMetrics } from '../../shared/types/outcome';

export class OutcomeCalculator {
  /**
   * Calculate outcomes for a round based on decisions and scenario config
   */
  static calculate(
    config: ScenarioConfig,
    currentState: Record<string, any>,
    decisions: DecisionData[]
  ): { metrics: OutcomeMetrics; newState: Record<string, any> } {
    const engine = new SimulationEngine(config, currentState as any);

    // Process all decisions for this round
    for (const decision of decisions) {
      engine.processDecision(decision);
    }

    // Calculate outcomes
    const metrics = engine.calculateOutcomes();

    // Get updated state
    const newState = engine.getCurrentState();

    return { metrics, newState };
  }

  /**
   * Apply market dynamics if configured
   */
  static applyMarketDynamics(
    state: Record<string, any>,
    config: ScenarioConfig,
    round: number
  ): Record<string, any> {
    if (!config.marketDynamics) {
      return state;
    }

    const updatedState = { ...state };

    // Apply market trends
    if (config.marketDynamics.marketTrends) {
      for (const trend of config.marketDynamics.marketTrends) {
        if (trend.period === round) {
          for (const metric of trend.affects) {
            if (updatedState[metric] !== undefined) {
              const change = trend.type === 'growth' ? trend.magnitude : -trend.magnitude;
              updatedState[metric] *= (1 + change);
            }
          }
        }
      }
    }

    // Apply external factors (randomly based on probability)
    if (config.marketDynamics.externalFactors) {
      for (const factor of config.marketDynamics.externalFactors) {
        if (Math.random() < factor.probability) {
          Object.keys(factor.impact).forEach(key => {
            if (updatedState[key] !== undefined) {
              updatedState[key] += factor.impact[key];
            }
          });
        }
      }
    }

    return updatedState;
  }
}