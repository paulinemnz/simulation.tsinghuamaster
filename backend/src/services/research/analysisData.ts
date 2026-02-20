import { pool } from '../../database/connection';

export interface ParticipantRecord {
  id: string;
  participant_code: string | null;
  mode: 'C0' | 'C1' | 'C2' | null;
  status: string | null;
  started_at: string | null; // Standardized: use started_at instead of start_time
  completed_at: string | null; // Standardized: use completed_at instead of end_time
  demographics: Record<string, any> | null;
  covariates: Record<string, any> | null;
  language: string | null;
  device: string | null;
  timezone: string | null;
  session_id: string | null;
  session_mode: 'C0' | 'C1' | 'C2' | null;
  session_status: string | null;
  session_started_at: string | null;
  session_completed_at: string | null;
}

export interface DecisionRecord {
  id: string;
  participant_id: string;
  act_number: number;
  option_id: string;
  submitted_at: string;
  decision_time_ms: number | null;
  confidence: number | null;
}

export interface MemoRecord {
  id: string;
  participant_id: string;
  act_number: number;
  text: string;
  word_count: number | null;
  submitted_at: string;
}

export interface ChatRecord {
  id: string;
  participant_id: string;
  act_number: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  meta: Record<string, any> | null;
}

export interface EventRecord {
  id: string;
  participant_id: string;
  act_number: number | null;
  event_type: string;
  event_value: string | null;
  timestamp: string;
  duration_ms: number | null;
  meta: Record<string, any> | null;
}

export interface RatingRecord {
  id: string;
  participant_id: string;
  act_number: number;
  rater_id: string | null;
  vertical_coherence: number | null;
  vertical_evidence: number | null;
  vertical_tradeoffs: number | null;
  vertical_accuracy: number | null;
  vertical_impl: number | null;
  horizontal_novelty: number | null;
  horizontal_diff: number | null;
  horizontal_synthesis: number | null;
  created_at: string;
}

export interface ComputedScoreRecord {
  participant_id: string;
  vq_act1: number | null;
  vq_act4: number | null;
  hq_act4: number | null;
  reflexivity_r: number | null;
  short_circuit_s: number | null;
  posttask_vq: number | null;
  posttask_hq: number | null;
  computed_at: string;
  computation_version: string;
}

const parseJson = (value: any): Record<string, any> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
};

export const loadParticipants = async (): Promise<ParticipantRecord[]> => {
  const result = await pool.query(
    `SELECT DISTINCT ON (p.id)
      p.id,
      p.participant_code,
      p.mode,
      p.status,
      p.started_at,
      p.completed_at,
      p.demographics,
      p.covariates,
      p.language,
      p.device,
      p.timezone,
      ss.id AS session_id,
      ss.mode AS session_mode,
      ss.status AS session_status,
      ss.started_at AS session_started_at,
      ss.completed_at AS session_completed_at
    FROM participants p
    LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
    ORDER BY p.id, ss.created_at DESC NULLS LAST`
  );

  return result.rows.map(row => ({
    ...row,
    demographics: parseJson(row.demographics),
    covariates: parseJson(row.covariates)
  }));
};

export const loadDecisions = async (): Promise<DecisionRecord[]> => {
  const result = await pool.query(
    `SELECT
      de.id,
      COALESCE(de.participant_id, ss.participant_id) AS participant_id,
      de.act_number,
      de.option_id,
      de.submitted_at,
      de.decision_time_ms,
      de.confidence
    FROM decision_events de
    JOIN simulation_sessions ss ON ss.id = de.simulation_session_id`
  );
  return result.rows;
};

export const loadMemos = async (): Promise<MemoRecord[]> => {
  const result = await pool.query('SELECT * FROM memos');
  return result.rows;
};

export const loadChatLogs = async (): Promise<ChatRecord[]> => {
  const result = await pool.query('SELECT * FROM chat_logs ORDER BY created_at');
  return result.rows.map(row => ({
    ...row,
    meta: parseJson(row.meta)
  }));
};

export const loadEventLogs = async (): Promise<EventRecord[]> => {
  const result = await pool.query('SELECT * FROM event_logs ORDER BY timestamp');
  return result.rows.map(row => ({
    ...row,
    meta: parseJson(row.meta)
  }));
};

export const loadRatings = async (): Promise<RatingRecord[]> => {
  const result = await pool.query('SELECT * FROM ratings');
  return result.rows;
};

export const loadComputedScores = async (): Promise<ComputedScoreRecord[]> => {
  const result = await pool.query('SELECT * FROM computed_scores');
  return result.rows;
};
