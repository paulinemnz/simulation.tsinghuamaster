import { pool } from '../database/connection';
import { DecisionType } from '../../shared/types/scenario.types';

export interface DecisionData {
  id?: string;
  simulation_session_id: string;
  round: number;
  category_id: string;
  category_type: DecisionType;
  values: Record<string, any>;
  submitted_at?: string;
  time_spent?: number;
  intermediate_changes?: number;
  created_at?: string;
}

export class Decision {
  static async create(data: DecisionData): Promise<DecisionData> {
    const result = await pool.query(
      `INSERT INTO decisions (simulation_session_id, round, category_id, category_type, values, time_spent, intermediate_changes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.simulation_session_id,
        data.round,
        data.category_id,
        data.category_type,
        JSON.stringify(data.values),
        data.time_spent || null,
        data.intermediate_changes || 0
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      values: typeof row.values === 'string' ? JSON.parse(row.values) : row.values
    };
  }

  static async findById(id: string): Promise<DecisionData | null> {
    const result = await pool.query(
      'SELECT * FROM decisions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      values: typeof row.values === 'string' ? JSON.parse(row.values) : row.values
    };
  }

  static async findBySession(simulationSessionId: string, round?: number): Promise<DecisionData[]> {
    const query = round
      ? 'SELECT * FROM decisions WHERE simulation_session_id = $1 AND round = $2 ORDER BY submitted_at'
      : 'SELECT * FROM decisions WHERE simulation_session_id = $1 ORDER BY round, submitted_at';
    
    const params = round ? [simulationSessionId, round] : [simulationSessionId];
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      ...row,
      values: typeof row.values === 'string' ? JSON.parse(row.values) : row.values
    }));
  }

  static async createEvent(
    decisionId: string,
    eventType: 'created' | 'modified' | 'submitted' | 'reverted',
    values?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    await pool.query(
      `INSERT INTO decision_events (decision_id, event_type, values, metadata)
       VALUES ($1, $2, $3, $4)`,
      [
        decisionId,
        eventType,
        values ? JSON.stringify(values) : null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );
  }
}