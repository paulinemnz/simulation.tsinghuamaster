import { pool } from '../database/connection';

export interface MemoData {
  id?: string;
  participant_id: string;
  act_number: number;
  text: string;
  word_count?: number;
  submitted_at?: string;
}

export class Memo {
  static async create(data: MemoData): Promise<MemoData> {
    const wordCount = data.word_count ?? data.text.trim().split(/\s+/).filter(Boolean).length;
    const result = await pool.query(
      `INSERT INTO memos (participant_id, act_number, text, word_count, submitted_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.participant_id,
        data.act_number,
        data.text,
        wordCount,
        data.submitted_at || new Date().toISOString()
      ]
    );
    return result.rows[0];
  }

  static async findByParticipant(participantId: string): Promise<MemoData[]> {
    const result = await pool.query(
      'SELECT * FROM memos WHERE participant_id = $1 ORDER BY act_number, submitted_at',
      [participantId]
    );
    return result.rows;
  }

  static async findByParticipantAndAct(participantId: string, actNumber: number): Promise<MemoData | null> {
    const result = await pool.query(
      `SELECT * FROM memos
       WHERE participant_id = $1 AND act_number = $2
       ORDER BY submitted_at DESC
       LIMIT 1`,
      [participantId, actNumber]
    );
    return result.rows[0] || null;
  }
}
