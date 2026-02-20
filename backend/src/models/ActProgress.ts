import { pool } from '../database/connection';

export interface ActProgressData {
  id?: string;
  simulation_session_id: string;
  act_number: number;
  started_at?: string;
  submitted_at?: string;
  created_at?: string;
}

export class ActProgress {
  static async create(data: ActProgressData): Promise<ActProgressData> {
    const result = await pool.query(
      `INSERT INTO act_progress (simulation_session_id, act_number, started_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (simulation_session_id, act_number) 
       DO UPDATE SET started_at = COALESCE(act_progress.started_at, $3)
       RETURNING *`,
      [
        data.simulation_session_id,
        data.act_number,
        data.started_at || new Date().toISOString()
      ]
    );

    return result.rows[0];
  }

  static async findById(id: string): Promise<ActProgressData | null> {
    const result = await pool.query(
      'SELECT * FROM act_progress WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findBySessionAndAct(
    simulationSessionId: string,
    actNumber: number
  ): Promise<ActProgressData | null> {
    const result = await pool.query(
      'SELECT * FROM act_progress WHERE simulation_session_id = $1 AND act_number = $2',
      [simulationSessionId, actNumber]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findBySession(simulationSessionId: string): Promise<ActProgressData[]> {
    const result = await pool.query(
      'SELECT * FROM act_progress WHERE simulation_session_id = $1 ORDER BY act_number',
      [simulationSessionId]
    );

    return result.rows;
  }

  static async update(
    simulationSessionId: string,
    actNumber: number,
    data: Partial<ActProgressData>
  ): Promise<ActProgressData | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.submitted_at !== undefined) {
      updates.push(`submitted_at = $${paramCount++}`);
      values.push(data.submitted_at);
    }
    if (data.started_at !== undefined) {
      updates.push(`started_at = $${paramCount++}`);
      values.push(data.started_at);
    }

    if (updates.length === 0) {
      return this.findBySessionAndAct(simulationSessionId, actNumber);
    }

    values.push(simulationSessionId, actNumber);
    const result = await pool.query(
      `UPDATE act_progress SET ${updates.join(', ')} 
       WHERE simulation_session_id = $${paramCount++} AND act_number = $${paramCount++} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
