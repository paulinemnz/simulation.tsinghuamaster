import { pool } from '../database/connection';

export interface ComputedScoresData {
  participant_id: string;
  vq_act1?: number | null;
  vq_act4?: number | null;
  hq_act4?: number | null;
  reflexivity_r?: number | null;
  short_circuit_s?: number | null;
  posttask_vq?: number | null;
  posttask_hq?: number | null;
  computed_at?: string;
  computation_version: string;
}

export class ComputedScores {
  static async upsert(data: ComputedScoresData): Promise<ComputedScoresData> {
    const result = await pool.query(
      `INSERT INTO computed_scores (
        participant_id,
        vq_act1,
        vq_act4,
        hq_act4,
        reflexivity_r,
        short_circuit_s,
        posttask_vq,
        posttask_hq,
        computed_at,
        computation_version
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (participant_id) DO UPDATE SET
        vq_act1 = EXCLUDED.vq_act1,
        vq_act4 = EXCLUDED.vq_act4,
        hq_act4 = EXCLUDED.hq_act4,
        reflexivity_r = EXCLUDED.reflexivity_r,
        short_circuit_s = EXCLUDED.short_circuit_s,
        posttask_vq = EXCLUDED.posttask_vq,
        posttask_hq = EXCLUDED.posttask_hq,
        computed_at = EXCLUDED.computed_at,
        computation_version = EXCLUDED.computation_version
      RETURNING *`,
      [
        data.participant_id,
        data.vq_act1 ?? null,
        data.vq_act4 ?? null,
        data.hq_act4 ?? null,
        data.reflexivity_r ?? null,
        data.short_circuit_s ?? null,
        data.posttask_vq ?? null,
        data.posttask_hq ?? null,
        data.computed_at || new Date().toISOString(),
        data.computation_version
      ]
    );
    return result.rows[0];
  }

  static async findByParticipant(participantId: string): Promise<ComputedScoresData | null> {
    const result = await pool.query(
      'SELECT * FROM computed_scores WHERE participant_id = $1',
      [participantId]
    );
    return result.rows[0] || null;
  }
}
