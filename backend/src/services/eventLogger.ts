import { pool } from '../database/connection';
import { EventLog, EventLogData } from '../models/EventLog';

const getParticipantIdForSession = async (sessionId: string): Promise<string | null> => {
  const result = await pool.query(
    'SELECT participant_id FROM simulation_sessions WHERE id = $1',
    [sessionId]
  );
  return result.rows[0]?.participant_id || null;
};

export const logEventForSession = async (params: {
  sessionId: string;
  actNumber?: number;
  eventType: string;
  eventValue?: string;
  durationMs?: number;
  meta?: Record<string, any>;
  timestamp?: string;
}): Promise<EventLogData | null> => {
  try {
    const participantId = await getParticipantIdForSession(params.sessionId);
    if (!participantId) return null;
    return EventLog.create({
      participant_id: participantId,
      act_number: params.actNumber ?? null,
      event_type: params.eventType,
      event_value: params.eventValue ?? null,
      duration_ms: params.durationMs ?? null,
      meta: params.meta || null,
      timestamp: params.timestamp
    });
  } catch (error) {
    console.error('Error logging event:', error);
    return null;
  }
};
