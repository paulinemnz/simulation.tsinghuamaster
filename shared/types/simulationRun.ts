/**
 * SimulationRun - Single source of truth for simulation session state
 * Used across frontend and backend to ensure consistency
 */

export interface SimulationRun {
  id: string; // simulationId (sessionId)
  participant_id: string;
  participant_code?: string;
  mode: 'C0' | 'C1' | 'C2';
  current_act: number; // 1-4
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  started_at: string; // ISO timestamp
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  identity_track?: string | null; // For Act IV
  decisions: {
    act1?: string | null; // option_id
    act2?: string | null;
    act3?: string | null;
    act4?: string | null;
  };
}

/**
 * Helper function to create a SimulationRun from database row
 */
export function createSimulationRunFromDB(row: any, decisions: Array<{ act_number: number; option_id: string }>): SimulationRun {
  const run: SimulationRun = {
    id: row.id,
    participant_id: row.participant_id,
    participant_code: row.participant_code,
    mode: row.mode as 'C0' | 'C1' | 'C2',
    current_act: row.current_act || 1,
    status: row.status as 'active' | 'paused' | 'completed' | 'abandoned',
    started_at: row.started_at || row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    identity_track: row.identity_track || null,
    decisions: {
      act1: null,
      act2: null,
      act3: null,
      act4: null
    }
  };

  // Populate decisions from decision_events
  decisions.forEach(decision => {
    if (decision.act_number === 1) run.decisions.act1 = decision.option_id;
    if (decision.act_number === 2) run.decisions.act2 = decision.option_id;
    if (decision.act_number === 3) run.decisions.act3 = decision.option_id;
    if (decision.act_number === 4) run.decisions.act4 = decision.option_id;
  });

  return run;
}
