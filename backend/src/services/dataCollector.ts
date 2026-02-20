import { pool } from '../database/connection';
import { logEventForSession } from './eventLogger';

export interface InteractionEvent {
  simulation_session_id: string;
  event_type: string;
  event_data?: Record<string, any>;
}

export class DataCollector {
  /**
   * Log an interaction event
   */
  static async logInteraction(event: InteractionEvent): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO interaction_events (simulation_session_id, event_type, event_data)
         VALUES ($1, $2, $3)`,
        [
          event.simulation_session_id,
          event.event_type,
          event.event_data ? JSON.stringify(event.event_data) : null
        ]
      );

      const actNumber = (event.event_data as any)?.actNumber;
      await logEventForSession({
        sessionId: event.simulation_session_id,
        actNumber: typeof actNumber === 'number' ? actNumber : undefined,
        eventType: event.event_type,
        eventValue: null,
        meta: event.event_data || null
      });
    } catch (error) {
      console.error('Error logging interaction event:', error);
      // Don't throw - logging failures shouldn't break the application
    }
  }

  static async countInteractionEventsByAct(
    simulationSessionId: string,
    eventType: string,
    actNumber: number
  ): Promise<number> {
    try {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM interaction_events
         WHERE simulation_session_id = $1
           AND event_type = $2
           AND (event_data->>'actNumber')::int = $3`,
        [simulationSessionId, eventType, actNumber]
      );
      return result.rows[0]?.count ?? 0;
    } catch (error) {
      console.error('Error counting interaction events:', error);
      return 0;
    }
  }

  static async countAiQuestionsByAct(
    simulationSessionId: string,
    actNumber: number
  ): Promise<number> {
    return this.countInteractionEventsByAct(simulationSessionId, 'ai_chat', actNumber);
  }

  /**
   * Save state snapshot
   */
  static async saveStateSnapshot(
    simulationSessionId: string,
    round: number,
    snapshotType: 'before' | 'after',
    stateData: Record<string, any>
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO state_snapshots (simulation_session_id, round, snapshot_type, state_data)
         VALUES ($1, $2, $3, $4)`,
        [
          simulationSessionId,
          round,
          snapshotType,
          JSON.stringify(stateData)
        ]
      );
    } catch (error) {
      console.error('Error saving state snapshot:', error);
      throw error; // This is more critical, so we throw
    }
  }

  /**
   * Track decision timing
   */
  static async trackDecisionTiming(
    decisionId: string,
    startTime: Date,
    endTime?: Date,
    pauses?: Array<{ start: Date; end?: Date }>
  ): Promise<void> {
    try {
      const duration = endTime ? endTime.getTime() - startTime.getTime() : null;
      const pausesJson = pauses ? JSON.stringify(pauses.map(p => ({
        start: p.start.toISOString(),
        end: p.end?.toISOString(),
        duration: p.end ? p.end.getTime() - p.start.getTime() : null
      }))) : null;

      await pool.query(
        `INSERT INTO decision_timing (decision_id, start_time, end_time, duration, pauses)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (decision_id) DO UPDATE SET
           end_time = $3,
           duration = $4,
           pauses = $5`,
        [
          decisionId,
          startTime.toISOString(),
          endTime?.toISOString() || null,
          duration,
          pausesJson
        ]
      );
    } catch (error) {
      console.error('Error tracking decision timing:', error);
      // Don't throw - timing failures shouldn't break the application
    }
  }

  static async getLatestInteractionEvent(
    simulationSessionId: string,
    eventType: string,
    actNumber: number
  ): Promise<{ event_type: string; event_data: Record<string, any> | null; timestamp: string } | null> {
    try {
      const result = await pool.query(
        `SELECT event_type, event_data, timestamp
         FROM interaction_events
         WHERE simulation_session_id = $1
           AND event_type = $2
           AND (event_data->>'actNumber')::int = $3
         ORDER BY timestamp DESC
         LIMIT 1`,
        [simulationSessionId, eventType, actNumber]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching latest interaction event:', error);
      return null;
    }
  }

  static async getLatestInteractionEventByType(
    simulationSessionId: string,
    eventType: string
  ): Promise<{ event_type: string; event_data: Record<string, any> | null; timestamp: string } | null> {
    try {
      const result = await pool.query(
        `SELECT event_type, event_data, timestamp
         FROM interaction_events
         WHERE simulation_session_id = $1
           AND event_type = $2
         ORDER BY timestamp DESC
         LIMIT 1`,
        [simulationSessionId, eventType]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching latest interaction event:', error);
      return null;
    }
  }

  static async getInteractionEventsByAct(
    simulationSessionId: string,
    actNumber: number,
    eventTypes?: string[]
  ): Promise<Array<{ event_type: string; event_data: Record<string, any> | null; timestamp: string }>> {
    try {
      const hasTypes = Array.isArray(eventTypes) && eventTypes.length > 0;
      const params: any[] = [simulationSessionId, actNumber];
      let typeFilter = '';
      if (hasTypes) {
        params.push(eventTypes);
        typeFilter = 'AND event_type = ANY($3)';
      }
      const result = await pool.query(
        `SELECT event_type, event_data, timestamp
         FROM interaction_events
         WHERE simulation_session_id = $1
           AND (event_data->>'actNumber')::int = $2
           ${typeFilter}
         ORDER BY timestamp ASC`,
        params
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching interaction events:', error);
      return [];
    }
  }

  /**
   * Get all interaction events across all acts for a session (for C2 strong memory)
   */
  static async getAllInteractionEventsBySession(
    simulationSessionId: string,
    eventTypes?: string[]
  ): Promise<Array<{ event_type: string; event_data: Record<string, any> | null; timestamp: string; actNumber?: number }>> {
    try {
      const hasTypes = Array.isArray(eventTypes) && eventTypes.length > 0;
      const params: any[] = [simulationSessionId];
      let typeFilter = '';
      if (hasTypes) {
        params.push(eventTypes);
        typeFilter = 'AND event_type = ANY($2)';
      }
      const result = await pool.query(
        `SELECT event_type, event_data, timestamp, (event_data->>'actNumber')::int AS act_number
         FROM interaction_events
         WHERE simulation_session_id = $1
           ${typeFilter}
         ORDER BY timestamp ASC`,
        params
      );
      return result.rows.map(row => ({
        event_type: row.event_type,
        event_data: row.event_data,
        timestamp: row.timestamp,
        actNumber: row.act_number
      }));
    } catch (error) {
      console.error('Error fetching all interaction events:', error);
      return [];
    }
  }
}