import { pool } from '../database/connection';

export interface SimulationSessionData {
  id?: string;
  participant_id: string;
  scenario_id: string;
  current_round: number;
  total_rounds: number;
  current_act?: number; // For Act-based simulation (1-4)
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  mode?: 'C0' | 'C1' | 'C2';
  started_at?: string;
  completed_at?: string;
  state_snapshot?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export class SimulationSession {
  static async create(data: SimulationSessionData): Promise<SimulationSessionData> {
    const result = await pool.query(
      `INSERT INTO simulation_sessions (participant_id, scenario_id, current_round, total_rounds, current_act, status, mode, state_snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.participant_id,
        data.scenario_id,
        data.current_round || 1,
        data.total_rounds,
        data.current_act || 1,
        data.status || 'active',
        data.mode || null,
        data.state_snapshot ? JSON.stringify(data.state_snapshot) : null
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    };
  }

  static async findById(id: string): Promise<SimulationSessionData | null> {
    const result = await pool.query(
      'SELECT * FROM simulation_sessions WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    };
  }

  static async findByParticipant(participantId: string): Promise<SimulationSessionData | null> {
    const result = await pool.query(
      'SELECT * FROM simulation_sessions WHERE participant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1',
      [participantId, 'active']
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    };
  }

  static async update(id: string, data: Partial<SimulationSessionData>): Promise<SimulationSessionData | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.current_round !== undefined) {
      updates.push(`current_round = $${paramCount++}`);
      values.push(data.current_round);
    }
    if (data.current_act !== undefined) {
      updates.push(`current_act = $${paramCount++}`);
      values.push(data.current_act);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.state_snapshot !== undefined) {
      updates.push(`state_snapshot = $${paramCount++}`);
      values.push(JSON.stringify(data.state_snapshot));
    }
    if (data.completed_at !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(data.completed_at);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE simulation_sessions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      state_snapshot: typeof row.state_snapshot === 'string' 
        ? JSON.parse(row.state_snapshot) 
        : row.state_snapshot
    };
  }
}