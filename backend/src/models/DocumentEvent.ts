import { pool } from '../database/connection';

export interface DocumentEventData {
  id?: string;
  simulation_session_id: string;
  act_number: number;
  document_id: string;
  opened_at?: string;
  closed_at?: string;
  duration_ms?: number;
  created_at?: string;
}

export class DocumentEvent {
  static async create(data: DocumentEventData): Promise<DocumentEventData> {
    const result = await pool.query(
      `INSERT INTO document_events (simulation_session_id, act_number, document_id, opened_at, closed_at, duration_ms)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.simulation_session_id,
        data.act_number,
        data.document_id,
        data.opened_at || new Date().toISOString(),
        data.closed_at || null,
        data.duration_ms || null
      ]
    );

    return result.rows[0];
  }

  static async findById(id: string): Promise<DocumentEventData | null> {
    const result = await pool.query(
      'SELECT * FROM document_events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async update(
    id: string,
    data: Partial<DocumentEventData>
  ): Promise<DocumentEventData | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.closed_at !== undefined) {
      updates.push(`closed_at = $${paramCount++}`);
      values.push(data.closed_at);
    }
    if (data.duration_ms !== undefined) {
      updates.push(`duration_ms = $${paramCount++}`);
      values.push(data.duration_ms);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE document_events SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findBySessionAndAct(
    simulationSessionId: string,
    actNumber: number
  ): Promise<DocumentEventData[]> {
    const result = await pool.query(
      'SELECT * FROM document_events WHERE simulation_session_id = $1 AND act_number = $2 ORDER BY opened_at',
      [simulationSessionId, actNumber]
    );

    return result.rows;
  }

  static async findBySession(simulationSessionId: string): Promise<DocumentEventData[]> {
    const result = await pool.query(
      'SELECT * FROM document_events WHERE simulation_session_id = $1 ORDER BY act_number, opened_at',
      [simulationSessionId]
    );

    return result.rows;
  }
}
