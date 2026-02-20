import { pool } from '../database/connection';
import { hasColumn } from '../database/schemaValidator';

export interface DecisionEventData {
  id?: string;
  simulation_session_id: string;
  participant_id?: string;
  act_number: number;
  option_id: string; // 'A', 'B', or 'C'
  submitted_at?: string;
  decision_time_ms?: number;
  confidence?: number;
  justification?: string;
  created_at?: string;
}

export class DecisionEvent {
  static async create(data: DecisionEventData): Promise<DecisionEventData> {
    // Check which columns exist in the table
    const hasParticipantId = await hasColumn('decision_events', 'participant_id');
    const hasDecisionTimeMs = await hasColumn('decision_events', 'decision_time_ms');
    const hasConfidence = await hasColumn('decision_events', 'confidence');
    const hasJustification = await hasColumn('decision_events', 'justification');
    const hasCreatedAt = await hasColumn('decision_events', 'created_at');
    
    // Build dynamic INSERT statement based on available columns
    const columns: string[] = ['simulation_session_id', 'act_number', 'option_id', 'submitted_at'];
    const values: any[] = [
      data.simulation_session_id,
      data.act_number,
      data.option_id,
      data.submitted_at || new Date().toISOString()
    ];
    let paramIndex = values.length;
    
    if (hasParticipantId) {
      columns.push('participant_id');
      values.push(data.participant_id || null);
      paramIndex++;
    }
    
    if (hasDecisionTimeMs) {
      columns.push('decision_time_ms');
      values.push(data.decision_time_ms || null);
      paramIndex++;
    }
    
    if (hasConfidence) {
      columns.push('confidence');
      values.push(data.confidence || null);
      paramIndex++;
    }
    
    if (hasJustification) {
      columns.push('justification');
      values.push(data.justification || null);
      paramIndex++;
    }
    
    if (hasCreatedAt) {
      columns.push('created_at');
      values.push(data.created_at || new Date().toISOString());
      paramIndex++;
    }
    
    // Build parameterized query
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO decision_events (${columns.join(', ')})
                 VALUES (${placeholders})
                 RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: string): Promise<DecisionEventData | null> {
    const result = await pool.query(
      'SELECT * FROM decision_events WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findBySessionAndAct(
    simulationSessionId: string,
    actNumber: number
  ): Promise<DecisionEventData | null> {
    const result = await pool.query(
      'SELECT * FROM decision_events WHERE simulation_session_id = $1 AND act_number = $2 ORDER BY submitted_at DESC LIMIT 1',
      [simulationSessionId, actNumber]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  static async findBySession(simulationSessionId: string): Promise<DecisionEventData[]> {
    const result = await pool.query(
      'SELECT * FROM decision_events WHERE simulation_session_id = $1 ORDER BY act_number, submitted_at',
      [simulationSessionId]
    );

    return result.rows;
  }
}
