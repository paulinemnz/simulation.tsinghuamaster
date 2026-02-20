import { pool } from '../database/connection';

export interface ChatLogData {
  id?: string;
  participant_id: string;
  act_number: number;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  meta?: Record<string, any> | null;
}

export class ChatLog {
  static async create(data: ChatLogData): Promise<ChatLogData> {
    const result = await pool.query(
      `INSERT INTO chat_logs (participant_id, act_number, role, content, meta, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.participant_id,
        data.act_number,
        data.role,
        data.content,
        data.meta ? JSON.stringify(data.meta) : null,
        data.created_at || new Date().toISOString()
      ]
    );
    return result.rows[0];
  }

  static async findByParticipant(participantId: string): Promise<ChatLogData[]> {
    const result = await pool.query(
      'SELECT * FROM chat_logs WHERE participant_id = $1 ORDER BY act_number, created_at',
      [participantId]
    );
    return result.rows;
  }
}
