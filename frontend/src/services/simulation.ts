import api from './api';
import { Scenario } from '../types/scenario';
import { Decision, DecisionSubmission } from '../types/decision';
import { Outcome } from '../types/outcome';

export const simulationService = {
  // Scenarios
  getScenarios: async (): Promise<Scenario[]> => {
    const response = await api.get('/scenarios');
    return response.data.data;
  },

  getScenario: async (id: string): Promise<Scenario> => {
    const response = await api.get(`/scenarios/${id}`);
    return response.data.data;
  },

  // Simulations
  startSimulation: async (scenarioId: string, participantId: string) => {
    const response = await api.post('/simulations/start', {
      scenario_id: scenarioId,
      participant_id: participantId,
    });
    return response.data.data;
  },

  getCurrentSimulation: async (participantId: string) => {
    const response = await api.get(`/simulations/participant/${participantId}`);
    return response.data.data;
  },

  submitRound: async (
    sessionId: string,
    round: number,
    decisions: DecisionSubmission[],
    timing?: { timeSpent?: number; intermediateChanges?: number }
  ) => {
    const decisionsWithTiming = decisions.map(d => ({
      ...d,
      time_spent: timing?.timeSpent,
      intermediate_changes: timing?.intermediateChanges,
    }));

    const response = await api.post(
      `/simulations/${sessionId}/round/${round}/submit`,
      { decisions: decisionsWithTiming }
    );
    return response.data.data;
  },

  getOutcomes: async (sessionId: string, round?: number): Promise<Outcome | Outcome[]> => {
    const url = round
      ? `/simulations/${sessionId}/outcomes?round=${round}`
      : `/simulations/${sessionId}/outcomes`;
    const response = await api.get(url);
    return response.data.data;
  },

  // Decisions
  getDecisions: async (sessionId: string, round?: number): Promise<Decision[]> => {
    const url = round
      ? `/decisions/session/${sessionId}?round=${round}`
      : `/decisions/session/${sessionId}`;
    const response = await api.get(url);
    return response.data.data;
  },
};