import { pool } from '../database/connection';

export interface ParticipantData {
  id?: string;
  user_id: string;
  session_id: string;
  participant_code?: string;
  demographics?: Record<string, any>;
  covariates?: Record<string, any>;
  mode?: 'C0' | 'C1' | 'C2';
  status?: 'started' | 'completed';
  language?: string;
  device?: string;
  timezone?: string;
  started_at?: string; // Standardized: use started_at (not start_time)
  completed_at?: string; // Standardized: use completed_at (not end_time)
  created_at?: string;
}

export class Participant {
  static async create(data: ParticipantData): Promise<ParticipantData> {
    const participantCode = data.participant_code || this.generateParticipantCode();
    
    // Use started_at (standardized column name)
    const startedAt = data.started_at || null;
    
    const result = await pool.query(
      `INSERT INTO participants (
        user_id,
        session_id,
        participant_code,
        demographics,
        covariates,
        mode,
        status,
        started_at,
        completed_at,
        language,
        device,
        timezone
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        data.user_id,
        data.session_id,
        participantCode,
        data.demographics ? JSON.stringify(data.demographics) : null,
        data.covariates ? JSON.stringify(data.covariates) : null,
        data.mode || null,
        data.status || null,
        startedAt,
        data.completed_at || null,
        data.language || null,
        data.device || null,
        data.timezone || null
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics,
      covariates: typeof row.covariates === 'string'
        ? JSON.parse(row.covariates)
        : row.covariates
    };
  }

  static async findById(id: string): Promise<ParticipantData | null> {
    // #region agent log
    const logPath = require('path').join(process.cwd(), '.cursor', 'debug.log');
    try { require('fs').appendFileSync(logPath, JSON.stringify({location:'Participant.ts:40',message:'Before database query',data:{hypothesisId:'A',participantId:id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
    // #endregion
    
    let result;
    try {
      result = await pool.query(
        'SELECT * FROM participants WHERE id = $1',
        [id]
      );
      // #region agent log
      try { require('fs').appendFileSync(logPath, JSON.stringify({location:'Participant.ts:47',message:'Database query successful',data:{hypothesisId:'A',rowCount:result.rows.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
      // #endregion
    } catch (error: any) {
      // #region agent log
      try { require('fs').appendFileSync(logPath, JSON.stringify({location:'Participant.ts:50',message:'Database query error',data:{hypothesisId:'A',errorMessage:error?.message,errorCode:error?.code,errorName:error?.name,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
      // #endregion
      throw error;
    }

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics,
      covariates: typeof row.covariates === 'string'
        ? JSON.parse(row.covariates)
        : row.covariates
    };
  }

  static async findByUserId(userId: string, sessionId?: string): Promise<ParticipantData | null> {
    const query = sessionId
      ? 'SELECT * FROM participants WHERE user_id = $1 AND session_id = $2'
      : 'SELECT * FROM participants WHERE user_id = $1 LIMIT 1';
    
    const params = sessionId ? [userId, sessionId] : [userId];
    const result = await pool.query(query, params);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics,
      covariates: typeof row.covariates === 'string'
        ? JSON.parse(row.covariates)
        : row.covariates
    };
  }

  static async findBySession(sessionId: string): Promise<ParticipantData[]> {
    const result = await pool.query(
      'SELECT * FROM participants WHERE session_id = $1',
      [sessionId]
    );

    return result.rows.map(row => ({
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics
    }));
  }

  static async findByParticipantCode(code: string): Promise<ParticipantData | null> {
    const result = await pool.query(
      'SELECT * FROM participants WHERE participant_code = $1',
      [code]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics,
      covariates: typeof row.covariates === 'string'
        ? JSON.parse(row.covariates)
        : row.covariates
    };
  }

  static async update(id: string, updates: Partial<ParticipantData>): Promise<ParticipantData | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.demographics !== undefined) {
      updateFields.push(`demographics = $${paramIndex}`);
      values.push(updates.demographics ? JSON.stringify(updates.demographics) : null);
      paramIndex++;
    }

    if (updates.covariates !== undefined) {
      updateFields.push(`covariates = $${paramIndex}`);
      values.push(updates.covariates ? JSON.stringify(updates.covariates) : null);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updates.completed_at !== undefined) {
      updateFields.push(`completed_at = $${paramIndex}`);
      values.push(updates.completed_at);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      // No fields to update, just return the existing record
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE participants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      demographics: typeof row.demographics === 'string' 
        ? JSON.parse(row.demographics) 
        : row.demographics,
      covariates: typeof row.covariates === 'string'
        ? JSON.parse(row.covariates)
        : row.covariates
    };
  }

  static generateParticipantCode(): string {
    return `P${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
}