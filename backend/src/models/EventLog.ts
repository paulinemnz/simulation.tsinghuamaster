import { pool } from '../database/connection';

export interface EventLogData {
  id?: string;
  participant_id: string;
  act_number?: number | null;
  event_type: string;
  event_value?: string | null;
  timestamp?: string;
  duration_ms?: number | null;
  meta?: Record<string, any> | null;
}

export class EventLog {
  static async create(data: EventLogData): Promise<EventLogData> {
    const result = await pool.query(
      `INSERT INTO event_logs (participant_id, act_number, event_type, event_value, timestamp, duration_ms, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.participant_id,
        data.act_number ?? null,
        data.event_type,
        data.event_value ?? null,
        data.timestamp || new Date().toISOString(),
        data.duration_ms ?? null,
        data.meta ? JSON.stringify(data.meta) : null
      ]
    );
    return result.rows[0];
  }

  static async findByParticipant(participantId: string): Promise<EventLogData[]> {
    const result = await pool.query(
      'SELECT * FROM event_logs WHERE participant_id = $1 ORDER BY timestamp',
      [participantId]
    );
    return result.rows;
  }
}
