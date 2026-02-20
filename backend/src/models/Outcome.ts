import { pool } from '../database/connection';
import { OutcomeMetrics } from '../../shared/types/outcome';

export interface OutcomeData {
  id?: string;
  simulation_session_id: string;
  round: number;
  metrics: OutcomeMetrics;
  state_snapshot: Record<string, any>;
  calculated_at?: string;
  created_at?: string;
}

export class Outcome {
  static async create(data: OutcomeData): Promise<OutcomeData> {
    const result = await pool.query(
      `INSERT INTO outcomes (simulation_session_id, round, metrics, state_snapshot)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (simulation_session_id, round) 
       DO UPDATE SET metrics = $3, state_snapshot = $4, calculated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        data.simulation_session_id,
        data.round,
        JSON.stringify(data.metrics),
        JSON.stringify(data.state_snapshot)
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    };
  }

  static async findBySession(simulationSessionId: string, round?: number): Promise<OutcomeData | OutcomeData[] | null> {
    const query = round
      ? 'SELECT * FROM outcomes WHERE simulation_session_id = $1 AND round = $2'
      : 'SELECT * FROM outcomes WHERE simulation_session_id = $1 ORDER BY round';
    
    const params = round ? [simulationSessionId, round] : [simulationSessionId];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) return null;

    const rows = result.rows.map(row => ({
      ...row,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    }));

    return round ? rows[0] : rows;
  }
}