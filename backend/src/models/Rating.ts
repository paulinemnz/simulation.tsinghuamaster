import { pool } from '../database/connection';

export interface RatingData {
  id?: string;
  participant_id: string;
  act_number: number;
  rater_id?: string | null;
  vertical_coherence?: number | null;
  vertical_evidence?: number | null;
  vertical_tradeoffs?: number | null;
  vertical_accuracy?: number | null;
  vertical_impl?: number | null;
  horizontal_novelty?: number | null;
  horizontal_diff?: number | null;
  horizontal_synthesis?: number | null;
  created_at?: string;
}

export class Rating {
  static async create(data: RatingData): Promise<RatingData> {
    const result = await pool.query(
      `INSERT INTO ratings (
        participant_id,
        act_number,
        rater_id,
        vertical_coherence,
        vertical_evidence,
        vertical_tradeoffs,
        vertical_accuracy,
        vertical_impl,
        horizontal_novelty,
        horizontal_diff,
        horizontal_synthesis,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *`,
      [
        data.participant_id,
        data.act_number,
        data.rater_id || null,
        data.vertical_coherence ?? null,
        data.vertical_evidence ?? null,
        data.vertical_tradeoffs ?? null,
        data.vertical_accuracy ?? null,
        data.vertical_impl ?? null,
        data.horizontal_novelty ?? null,
        data.horizontal_diff ?? null,
        data.horizontal_synthesis ?? null,
        data.created_at || new Date().toISOString()
      ]
    );
    return result.rows[0];
  }

  static async findByParticipant(participantId: string): Promise<RatingData[]> {
    const result = await pool.query(
      'SELECT * FROM ratings WHERE participant_id = $1 ORDER BY act_number, created_at',
      [participantId]
    );
    return result.rows;
  }
}
