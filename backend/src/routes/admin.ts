import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole } from '../middleware/auth';
import { pool } from '../database/connection';
import { hasColumn } from '../database/schemaValidator';
import { memoryMonitor } from '../utils/memoryMonitor';

const router = express.Router();

// Admin login endpoint (must be before auth middleware)
router.post(
  '/login',
  [
    body('secret').notEmpty().withMessage('Admin secret is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const adminSecret = process.env.ADMIN_SECRET;
      if (!adminSecret) {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Admin secret not configured on server' 
        });
      }

      if (req.body.secret !== adminSecret) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Invalid admin secret' 
        });
      }

      // Generate a token for admin access
      const tokenSecret = process.env.JWT_SECRET || 'your-secret-key';
      const token = jwt.sign(
        { 
          id: 'admin',
          role: 'admin',
          isAdmin: true 
        },
        tokenSecret,
        { expiresIn: '24h' }
      );

      res.json({
        status: 'success',
        data: {
          token,
          user: {
            id: 'admin',
            role: 'admin',
            email: 'admin@system'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// All other admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin', 'researcher']));

// Admin overview
router.get('/overview', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Get total participants
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM participants');
    const totalParticipants = parseInt(totalResult.rows[0].count);

    // Get completed participants
    const completedResult = await pool.query(
      'SELECT COUNT(*) as count FROM participants WHERE completed_at IS NOT NULL'
    );
    const completedParticipants = parseInt(completedResult.rows[0].count);
    const completionRate = totalParticipants > 0 ? completedParticipants / totalParticipants : 0;

    // Get participants by mode
    const modeResult = await pool.query(`
      SELECT mode, COUNT(*) as count 
      FROM participants 
      WHERE mode IS NOT NULL 
      GROUP BY mode
    `);
    const byMode: Record<string, number> = {};
    modeResult.rows.forEach((row: any) => {
      byMode[row.mode] = parseInt(row.count);
    });

    // Get average completion time by mode
    const avgTimeResult = await pool.query(`
      SELECT 
        mode,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_ms
      FROM participants 
      WHERE mode IS NOT NULL AND completed_at IS NOT NULL AND started_at IS NOT NULL
      GROUP BY mode
    `);
    const avgCompletionMs: Record<string, number> = {};
    avgTimeResult.rows.forEach((row: any) => {
      avgCompletionMs[row.mode] = parseFloat(row.avg_ms) || 0;
    });

    // Get missing decisions count
    const missingDecisionsResult = await pool.query(`
      SELECT COUNT(DISTINCT p.id) as count
      FROM participants p
      LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
      LEFT JOIN decision_events de ON de.simulation_session_id = ss.id
      WHERE p.completed_at IS NOT NULL 
        AND (de.id IS NULL OR (SELECT COUNT(*) FROM decision_events WHERE simulation_session_id = ss.id) < 4)
    `);
    const missingDecisions = parseInt(missingDecisionsResult.rows[0].count) || 0;

    // Get missing memos count (assuming memos are stored somewhere - adjust based on your schema)
    const missingMemos = 0; // TODO: Implement based on your memo storage

    res.json({ 
      status: 'success', 
      data: {
        totalParticipants,
        completedParticipants,
        completionRate,
        byMode,
        avgCompletionMs,
        missingDataWarnings: {
          missingDecisions,
          missingMemos
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all participants
router.get('/participants', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.participant_code as "participantCode",
        p.mode,
        p.status,
        p.started_at as "startTime",
        p.completed_at as "endTime",
        CASE 
          WHEN p.completed_at IS NOT NULL AND p.started_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) * 1000
          ELSE NULL
        END as "durationMs"
      FROM participants p
      ORDER BY p.created_at DESC
    `);

    // For each participant, get their decisions and memos
    const participantsWithDetails = await Promise.all(
      result.rows.map(async (participant: any) => {
        // Get decisions for each act (1-4)
        const decisionsResult = await pool.query(`
          SELECT DISTINCT de.act_number
          FROM decision_events de
          JOIN simulation_sessions ss ON ss.id = de.simulation_session_id
          WHERE ss.participant_id = $1
        `, [participant.id]);

        const decisions = [false, false, false, false];
        decisionsResult.rows.forEach((row: any) => {
          const actNum = row.act_number;
          if (actNum >= 1 && actNum <= 4) {
            decisions[actNum - 1] = true;
          }
        });

        // Get memos (assuming they're stored in a memos table or similar)
        // TODO: Adjust based on your actual memo storage
        const memos = [false]; // Placeholder

        return {
          ...participant,
          decisions,
          memos
        };
      })
    );

    res.json({ status: 'success', data: participantsWithDetails });
  } catch (error) {
    next(error);
  }
});

// Reset all simulation runs (DEV ONLY - requires NODE_ENV !== 'production')
router.post(
  '/reset/all',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Reset functionality is disabled in production' 
        });
      }

      // Delete all simulation data (cascading deletes will handle related records)
      await pool.query('DELETE FROM simulation_sessions');
      await pool.query('DELETE FROM participants WHERE participant_code IS NOT NULL');
      
      res.json({ 
        status: 'success', 
        message: 'All simulation runs and participants have been reset' 
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset a specific participant's runs
router.post(
  '/reset/participant/:participantId',
  [
    param('participantId').notEmpty().withMessage('Participant ID is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const participantId = req.params.participantId;
      
      // Find participant by code or ID
      const participantResult = await pool.query(
        'SELECT id FROM participants WHERE id = $1 OR participant_code = $1',
        [participantId]
      );
      
      if (participantResult.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Participant not found' 
        });
      }
      
      const participantDbId = participantResult.rows[0].id;
      
      // Delete all sessions for this participant (cascading deletes will handle related records)
      await pool.query(
        'DELETE FROM simulation_sessions WHERE participant_id = $1',
        [participantDbId]
      );
      
      res.json({ 
        status: 'success', 
        message: `All simulation runs for participant ${participantId} have been reset` 
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export CSV (all participants)
router.get(
  '/exports',
  [
    query('format').optional().isIn(['csv', 'json']),
    query('anonymize').optional().isBoolean(),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const format = (req.query.format as string) || 'json';
      const anonymize = req.query.anonymize === 'true';

      // Get all simulation data
      const result = await pool.query(`
        SELECT 
          p.id as participant_id,
          ${anonymize ? "CONCAT('P', ROW_NUMBER() OVER (ORDER BY p.created_at)) as participant_code," : 'p.participant_code,'}
          p.mode,
          p.status as participant_status,
          p.started_at,
          p.completed_at,
          ss.id as session_id,
          ss.current_act,
          ss.status as session_status,
          ss.identity_track,
          ss.started_at as session_started_at,
          ss.completed_at as session_completed_at,
          de.act_number,
          de.option_id,
          de.submitted_at as decision_submitted_at,
          de.decision_time_ms
        FROM participants p
        LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
        LEFT JOIN decision_events de ON de.simulation_session_id = ss.id
        ORDER BY p.created_at, ss.created_at, de.act_number
      `);

      if (format === 'csv') {
        // Simple CSV conversion
        if (result.rows.length === 0) {
          return res.status(404).json({ status: 'error', message: 'No data to export' });
        }
        
        const headers = Object.keys(result.rows[0]);
        const csvRows = [
          headers.join(','),
          ...result.rows.map(row => 
            headers.map(header => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              if (typeof value === 'object') return JSON.stringify(value);
              return String(value).replace(/"/g, '""');
            }).map(v => `"${v}"`).join(',')
          )
        ];
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=simulation_export.csv');
        res.send(csvRows.join('\n'));
      } else {
        res.json({ status: 'success', data: result.rows });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Export JSON (full event log)
router.get(
  '/exports/events',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await pool.query(`
        SELECT 
          el.*,
          p.participant_code,
          ss.id as session_id
        FROM event_logs el
        JOIN participants p ON p.id = el.participant_id
        LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
        ORDER BY el.timestamp
      `);

      res.json({ status: 'success', data: result.rows });
    } catch (error) {
      next(error);
    }
  }
);

// View one participant timeline
router.get(
  '/participant/:participantId/timeline',
  [
    param('participantId').notEmpty().withMessage('Participant ID is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const participantId = req.params.participantId;
      
      // Get participant info
      const participantResult = await pool.query(
        'SELECT * FROM participants WHERE id = $1 OR participant_code = $1',
        [participantId]
      );
      
      if (participantResult.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Participant not found' 
        });
      }
      
      const participant = participantResult.rows[0];
      const participantDbId = participant.id;
      
      // Get all sessions for this participant
      const sessionsResult = await pool.query(
        'SELECT * FROM simulation_sessions WHERE participant_id = $1 ORDER BY created_at',
        [participantDbId]
      );
      
      // Get all decisions for this participant
      const decisionsResult = await pool.query(
        `SELECT de.*, ss.id as session_id
         FROM decision_events de
         JOIN simulation_sessions ss ON ss.id = de.simulation_session_id
         WHERE ss.participant_id = $1
         ORDER BY de.act_number, de.submitted_at`,
        [participantDbId]
      );
      
      // Get all events for this participant
      const eventsResult = await pool.query(
        'SELECT * FROM event_logs WHERE participant_id = $1 ORDER BY timestamp',
        [participantDbId]
      );
      
      res.json({
        status: 'success',
        data: {
          participant,
          sessions: sessionsResult.rows,
          decisions: decisionsResult.rows,
          events: eventsResult.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get Act 1 data for all participants
router.get('/act1', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Check if justification column exists
    const hasJustificationColumn = await hasColumn('decision_events', 'justification');
    
    // Build query dynamically based on whether justification column exists
    const justificationSelect = hasJustificationColumn 
      ? 'de.justification as act1_justification,'
      : 'NULL::TEXT as act1_justification,';
    
    // Get all participants with their Act 1 decisions
    const result = await pool.query(`
      SELECT 
        p.id as participant_id,
        p.participant_code,
        p.mode,
        p.status,
        ss.id as simulation_session_id,
        de.option_id as act1_choice,
        ${justificationSelect}
        de.submitted_at as act1_submitted_at,
        de.decision_time_ms as act1_decision_time_ms
      FROM participants p
      LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
      LEFT JOIN decision_events de ON de.simulation_session_id = ss.id AND de.act_number = 1
      ORDER BY p.created_at DESC
    `);

    // For each participant, get their chat/interaction data based on mode
    const participantsWithAct1Data = await Promise.all(
      result.rows.map(async (row: any) => {
        const participantId = row.participant_id;
        const mode = row.mode;
        const sessionId = row.simulation_session_id;

        let act1Data: any = {
          act1_choice: row.act1_choice || null,
          act1_justification: row.act1_justification || null,
          act1_submitted_at: row.act1_submitted_at || null,
          act1_decision_time_ms: row.act1_decision_time_ms || null
        };

        if (!sessionId) {
          return {
            participant_id: participantId,
            participant_code: row.participant_code,
            mode: mode,
            status: row.status,
            ...act1Data
          };
        }

        // C1 (GENAI) mode: Get AI chat queries (up to 3)
        if (mode === 'C1') {
          const chatLogsResult = await pool.query(`
            SELECT content, created_at, meta
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 1 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 3
          `, [participantId]);

          const queries = chatLogsResult.rows.map((log: any, index: number) => ({
            text: log.content,
            length_chars: log.content?.length || 0,
            created_at: log.created_at
          }));

          act1Data.act1_ai_queries_count = queries.length;
          act1Data.act1_ai_query_1_text = queries[0]?.text || null;
          act1Data.act1_ai_query_2_text = queries[1]?.text || null;
          act1Data.act1_ai_query_3_text = queries[2]?.text || null;
          act1Data.act1_ai_query_1_length_chars = queries[0]?.length_chars || null;
          act1Data.act1_ai_query_2_length_chars = queries[1]?.length_chars || null;
          act1Data.act1_ai_query_3_length_chars = queries[2]?.length_chars || null;
        }

        // C2 (AGENTIC) mode: Get full discussion log
        if (mode === 'C2') {
          const chatLogsResult = await pool.query(`
            SELECT role, content, created_at
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 1
            ORDER BY created_at ASC
          `, [participantId]);

          // Build full discussion log text
          const discussionLog = chatLogsResult.rows
            .map((log: any) => `${log.role === 'user' ? 'User' : 'Assistant'}: ${log.content}`)
            .join('\n\n');

          const totalLength = chatLogsResult.rows
            .filter((log: any) => log.role === 'user')
            .reduce((sum: number, log: any) => sum + (log.content?.length || 0), 0);

          act1Data.act1_ai_discussions_count = chatLogsResult.rows.filter((log: any) => log.role === 'user').length;
          act1Data.act1_ai_discussion_log = discussionLog || null;
          act1Data.act1_ai_discussion_total_length_chars = totalLength || null;
        }

        return {
          participant_id: participantId,
          participant_code: row.participant_code,
          mode: mode,
          status: row.status,
          ...act1Data
        };
      })
    );

    res.json({ status: 'success', data: participantsWithAct1Data });
  } catch (error) {
    next(error);
  }
});

// Get Act 2 data for all participants
router.get('/act2', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Check if justification column exists
    const hasJustificationColumn = await hasColumn('decision_events', 'justification');
    
    // Build query dynamically based on whether justification column exists
    const rationaleSelect = hasJustificationColumn 
      ? 'de.justification as act2_rationale,'
      : 'NULL::TEXT as act2_rationale,';
    
    // Get all participants with their Act 2 decisions
    const result = await pool.query(`
      SELECT 
        p.id as participant_id,
        p.participant_code,
        p.mode,
        p.status,
        ss.id as simulation_session_id,
        de.option_id as act2_choice,
        ${rationaleSelect}
        de.submitted_at as act2_submitted_at,
        de.decision_time_ms as act2_decision_time_ms
      FROM participants p
      LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
      LEFT JOIN decision_events de ON de.simulation_session_id = ss.id AND de.act_number = 2
      ORDER BY p.created_at DESC
    `);

    // For each participant, get their chat/interaction data based on mode
    const participantsWithAct2Data = await Promise.all(
      result.rows.map(async (row: any) => {
        const participantId = row.participant_id;
        const mode = row.mode;
        const sessionId = row.simulation_session_id;

        let act2Data: any = {
          act2_choice: row.act2_choice || null,
          act2_rationale: row.act2_rationale || null,
          act2_submitted_at: row.act2_submitted_at || null,
          act2_decision_time_ms: row.act2_decision_time_ms || null
        };

        if (!sessionId) {
          return {
            participant_id: participantId,
            participant_code: row.participant_code,
            mode: mode,
            status: row.status,
            ...act2Data
          };
        }

        // C1 (GENAI) mode: Get AI chat queries (up to 3)
        if (mode === 'C1') {
          const chatLogsResult = await pool.query(`
            SELECT content, created_at, meta
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 2 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 3
          `, [participantId]);

          const queries = chatLogsResult.rows.map((log: any, index: number) => ({
            text: log.content,
            length_chars: log.content?.length || 0,
            created_at: log.created_at
          }));

          act2Data.act2_ai_queries_count = queries.length;
          act2Data.act2_ai_query_1_text = queries[0]?.text || null;
          act2Data.act2_ai_query_2_text = queries[1]?.text || null;
          act2Data.act2_ai_query_3_text = queries[2]?.text || null;
          act2Data.act2_ai_query_1_length_chars = queries[0]?.length_chars || null;
          act2Data.act2_ai_query_2_length_chars = queries[1]?.length_chars || null;
          act2Data.act2_ai_query_3_length_chars = queries[2]?.length_chars || null;
        }

        // C2 (AGENTIC) mode: Get full discussion log
        if (mode === 'C2') {
          const chatLogsResult = await pool.query(`
            SELECT role, content, created_at
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 2
            ORDER BY created_at ASC
          `, [participantId]);

          // Build full discussion log text
          const discussionLog = chatLogsResult.rows
            .map((log: any) => `${log.role === 'user' ? 'User' : 'Assistant'}: ${log.content}`)
            .join('\n\n');

          const totalLength = chatLogsResult.rows
            .filter((log: any) => log.role === 'user')
            .reduce((sum: number, log: any) => sum + (log.content?.length || 0), 0);

          act2Data.act2_ai_discussions_count = chatLogsResult.rows.filter((log: any) => log.role === 'user').length;
          act2Data.act2_ai_discussion_log = discussionLog || null;
          act2Data.act2_ai_discussion_total_length_chars = totalLength || null;
        }

        return {
          participant_id: participantId,
          participant_code: row.participant_code,
          mode: mode,
          status: row.status,
          ...act2Data
        };
      })
    );

    res.json({ status: 'success', data: participantsWithAct2Data });
  } catch (error) {
    next(error);
  }
});

// Get Act 3 data for all participants
router.get('/act3', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Check if justification column exists
    const hasJustificationColumn = await hasColumn('decision_events', 'justification');
    
    // Build query dynamically based on whether justification column exists
    const rationaleSelect = hasJustificationColumn 
      ? 'de.justification as act3_rationale,'
      : 'NULL::TEXT as act3_rationale,';
    
    // Get all participants with their Act 3 decisions
    const result = await pool.query(`
      SELECT 
        p.id as participant_id,
        p.participant_code,
        p.mode,
        p.status,
        ss.id as simulation_session_id,
        de.option_id as act3_choice,
        ${rationaleSelect}
        de.submitted_at as act3_submitted_at,
        de.decision_time_ms as act3_decision_time_ms
      FROM participants p
      LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
      LEFT JOIN decision_events de ON de.simulation_session_id = ss.id AND de.act_number = 3
      ORDER BY p.created_at DESC
    `);

    // For each participant, get their chat/interaction data based on mode
    const participantsWithAct3Data = await Promise.all(
      result.rows.map(async (row: any) => {
        const participantId = row.participant_id;
        const mode = row.mode;
        const sessionId = row.simulation_session_id;

        let act3Data: any = {
          act3_choice: row.act3_choice || null,
          act3_rationale: row.act3_rationale || null,
          act3_submitted_at: row.act3_submitted_at || null,
          act3_decision_time_ms: row.act3_decision_time_ms || null
        };

        if (!sessionId) {
          return {
            participant_id: participantId,
            participant_code: row.participant_code,
            mode: mode,
            status: row.status,
            ...act3Data
          };
        }

        // C1 (GENAI) mode: Get AI chat queries (up to 3)
        if (mode === 'C1') {
          const chatLogsResult = await pool.query(`
            SELECT content, created_at, meta
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 3 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 3
          `, [participantId]);

          const queries = chatLogsResult.rows.map((log: any, index: number) => ({
            text: log.content,
            length_chars: log.content?.length || 0,
            created_at: log.created_at
          }));

          act3Data.act3_ai_queries_count = queries.length;
          act3Data.act3_ai_query_1_text = queries[0]?.text || null;
          act3Data.act3_ai_query_2_text = queries[1]?.text || null;
          act3Data.act3_ai_query_3_text = queries[2]?.text || null;
          act3Data.act3_ai_query_1_length_chars = queries[0]?.length_chars || null;
          act3Data.act3_ai_query_2_length_chars = queries[1]?.length_chars || null;
          act3Data.act3_ai_query_3_length_chars = queries[2]?.length_chars || null;
        }

        // C2 (AGENTIC) mode: Get full discussion log
        if (mode === 'C2') {
          const chatLogsResult = await pool.query(`
            SELECT role, content, created_at
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 3
            ORDER BY created_at ASC
          `, [participantId]);

          // Build full discussion log text
          const discussionLog = chatLogsResult.rows
            .map((log: any) => `${log.role === 'user' ? 'User' : 'Assistant'}: ${log.content}`)
            .join('\n\n');

          const totalLength = chatLogsResult.rows
            .filter((log: any) => log.role === 'user')
            .reduce((sum: number, log: any) => sum + (log.content?.length || 0), 0);

          act3Data.act3_ai_discussions_count = chatLogsResult.rows.filter((log: any) => log.role === 'user').length;
          act3Data.act3_ai_discussion_log = discussionLog || null;
          act3Data.act3_ai_discussion_total_length_chars = totalLength || null;
        }

        return {
          participant_id: participantId,
          participant_code: row.participant_code,
          mode: mode,
          status: row.status,
          ...act3Data
        };
      })
    );

    res.json({ status: 'success', data: participantsWithAct3Data });
  } catch (error) {
    next(error);
  }
});

// Get Act 4 data for all participants
router.get('/act4', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Check if justification column exists
    const hasJustificationColumn = await hasColumn('decision_events', 'justification');
    
    // Build query dynamically based on whether justification column exists
    const rationaleSelect = hasJustificationColumn 
      ? 'de.justification as act4_rationale,'
      : 'NULL::TEXT as act4_rationale,';
    
    // Get all participants with their Act 4 decisions
    const result = await pool.query(`
      SELECT 
        p.id as participant_id,
        p.participant_code,
        p.mode,
        p.status,
        ss.id as simulation_session_id,
        de.option_id as act4_choice,
        ${rationaleSelect}
        de.submitted_at as act4_submitted_at,
        de.decision_time_ms as act4_decision_time_ms
      FROM participants p
      LEFT JOIN simulation_sessions ss ON ss.participant_id = p.id
      LEFT JOIN decision_events de ON de.simulation_session_id = ss.id AND de.act_number = 4
      ORDER BY p.created_at DESC
    `);

    // For each participant, get their chat/interaction data based on mode
    const participantsWithAct4Data = await Promise.all(
      result.rows.map(async (row: any) => {
        const participantId = row.participant_id;
        const mode = row.mode;
        const sessionId = row.simulation_session_id;

        let act4Data: any = {
          act4_choice: row.act4_choice || null,
          act4_rationale: row.act4_rationale || null,
          act4_submitted_at: row.act4_submitted_at || null,
          act4_decision_time_ms: row.act4_decision_time_ms || null
        };

        if (!sessionId) {
          return {
            participant_id: participantId,
            participant_code: row.participant_code,
            mode: mode,
            status: row.status,
            ...act4Data
          };
        }

        // C1 (GENAI) mode: Get AI chat queries (up to 3)
        if (mode === 'C1') {
          const chatLogsResult = await pool.query(`
            SELECT content, created_at, meta
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 4 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 3
          `, [participantId]);

          const queries = chatLogsResult.rows.map((log: any, index: number) => ({
            text: log.content,
            length_chars: log.content?.length || 0,
            created_at: log.created_at
          }));

          act4Data.act4_ai_queries_count = queries.length;
          act4Data.act4_ai_query_1_text = queries[0]?.text || null;
          act4Data.act4_ai_query_2_text = queries[1]?.text || null;
          act4Data.act4_ai_query_3_text = queries[2]?.text || null;
          act4Data.act4_ai_query_1_length_chars = queries[0]?.length_chars || null;
          act4Data.act4_ai_query_2_length_chars = queries[1]?.length_chars || null;
          act4Data.act4_ai_query_3_length_chars = queries[2]?.length_chars || null;
        }

        // C2 (AGENTIC) mode: Get full discussion log
        if (mode === 'C2') {
          const chatLogsResult = await pool.query(`
            SELECT role, content, created_at
            FROM chat_logs
            WHERE participant_id = $1 AND act_number = 4
            ORDER BY created_at ASC
          `, [participantId]);

          // Build full discussion log text
          const discussionLog = chatLogsResult.rows
            .map((log: any) => `${log.role === 'user' ? 'User' : 'Assistant'}: ${log.content}`)
            .join('\n\n');

          const totalLength = chatLogsResult.rows
            .filter((log: any) => log.role === 'user')
            .reduce((sum: number, log: any) => sum + (log.content?.length || 0), 0);

          act4Data.act4_ai_discussions_count = chatLogsResult.rows.filter((log: any) => log.role === 'user').length;
          act4Data.act4_ai_discussion_log = discussionLog || null;
          act4Data.act4_ai_discussion_total_length_chars = totalLength || null;
        }

        return {
          participant_id: participantId,
          participant_code: row.participant_code,
          mode: mode,
          status: row.status,
          ...act4Data
        };
      })
    );

    res.json({ status: 'success', data: participantsWithAct4Data });
  } catch (error) {
    next(error);
  }
});

// Get participant detail with all data
router.get(
  '/participants/:id',
  [
    param('id').notEmpty().withMessage('Participant ID is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const participantId = req.params.id;
      
      // Get participant info - handle both UUID and participant_code
      // Check if it's a valid UUID format, otherwise treat as participant_code
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(participantId);
      
      let participantResult;
      if (isUUID) {
        // It's a UUID, query by id
        participantResult = await pool.query(
          'SELECT * FROM participants WHERE id = $1::uuid',
          [participantId]
        );
      } else {
        // It's a participant_code, query by participant_code
        participantResult = await pool.query(
          'SELECT * FROM participants WHERE participant_code = $1',
          [participantId]
        );
      }
      
      if (participantResult.rows.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Participant not found' 
        });
      }
      
      const participant = participantResult.rows[0];
      const participantDbId = participant.id;
      
      // Get all decisions
      const decisionsResult = await pool.query(
        `SELECT de.*, ss.id as session_id
         FROM decision_events de
         JOIN simulation_sessions ss ON ss.id = de.simulation_session_id
         WHERE ss.participant_id = $1
         ORDER BY de.act_number, de.submitted_at`,
        [participantDbId]
      );
      
      // Get all memos
      const memosResult = await pool.query(
        'SELECT * FROM memos WHERE participant_id = $1 ORDER BY act_number',
        [participantDbId]
      );
      
      // Get all chat logs
      const chatLogsResult = await pool.query(
        'SELECT * FROM chat_logs WHERE participant_id = $1 ORDER BY act_number, created_at',
        [participantDbId]
      );
      
      // Get all event logs
      const eventsResult = await pool.query(
        'SELECT * FROM event_logs WHERE participant_id = $1 ORDER BY timestamp',
        [participantDbId]
      );
      
      // Get all ratings
      const ratingsResult = await pool.query(
        'SELECT * FROM ratings WHERE participant_id = $1 ORDER BY act_number',
        [participantDbId]
      );
      
      // Get computed scores
      const scoresResult = await pool.query(
        'SELECT * FROM computed_scores WHERE participant_id = $1',
        [participantDbId]
      );
      
      // Get AI attitude responses (if table exists)
      let aiAttitudeResponses = null;
      try {
        const aiAttitudeResult = await pool.query(
          `SELECT aar.*, ss.id as session_id
           FROM ai_attitude_responses aar
           JOIN simulation_sessions ss ON ss.id = aar.simulation_session_id
           WHERE ss.participant_id = $1`,
          [participantDbId]
        );
        aiAttitudeResponses = aiAttitudeResult.rows.length > 0 ? aiAttitudeResult.rows[0] : null;
      } catch (err: any) {
        // Table might not exist yet, ignore error
        console.warn('AI attitude responses table not found:', err.message);
      }
      
      res.json({
        status: 'success',
        data: {
          participant,
          decisions: decisionsResult.rows,
          memos: memosResult.rows,
          chatLogs: chatLogsResult.rows,
          eventLogs: eventsResult.rows,
          ratings: ratingsResult.rows,
          computedScores: scoresResult.rows.length > 0 ? scoresResult.rows[0] : null,
          aiAttitudeResponses
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all post-simulation memos (Act 4 memos)
router.get(
  '/post-simulation',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Get all memos for Act 4 (post-simulation strategic memos)
      const memosResult = await pool.query(`
        SELECT 
          m.*,
          p.participant_code,
          p.mode,
          p.status as participant_status
        FROM memos m
        JOIN participants p ON p.id = m.participant_id
        WHERE m.act_number = 4
        ORDER BY m.submitted_at DESC
      `);

      res.json({
        status: 'success',
        data: memosResult.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all AI attitude assessment responses
router.get(
  '/ai-attitude',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Check if table exists first
      const tableExistsResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ai_attitude_responses'
        );
      `);
      
      if (!tableExistsResult.rows[0].exists) {
        return res.json({
          status: 'success',
          data: []
        });
      }

      // Get all AI attitude responses with participant info
      const result = await pool.query(`
        SELECT 
          aar.*,
          p.participant_code,
          p.mode,
          p.status as participant_status,
          ss.id as simulation_session_id
        FROM ai_attitude_responses aar
        JOIN participants p ON p.id = aar.participant_id
        LEFT JOIN simulation_sessions ss ON ss.id = aar.simulation_session_id
        ORDER BY aar.submitted_at DESC
      `);

      res.json({
        status: 'success',
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

// Memory monitoring endpoint
router.get(
  '/memory',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Record current memory state
      memoryMonitor.recordMemory();
      
      // Get memory statistics
      const stats = memoryMonitor.getMemoryStats();
      const health = memoryMonitor.checkMemoryHealth();
      
      // Get database pool statistics
      const dbPoolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
      
      res.json({
        status: 'success',
        data: {
          memory: stats,
          health,
          databasePool: dbPoolStats,
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all pre-simulation questionnaire data
router.get(
  '/pre-simulation',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // Get all participants - include those with simulation sessions (who have started pre-simulation)
      // Use DISTINCT ON to avoid duplicates when a participant has multiple sessions
      const result = await pool.query(`
        SELECT DISTINCT ON (p.id)
          p.id,
          p.participant_code,
          p.mode,
          p.status as participant_status,
          p.demographics,
          p.covariates,
          p.created_at,
          p.started_at,
          CASE 
            WHEN EXISTS (SELECT 1 FROM simulation_sessions ss WHERE ss.participant_id = p.id) THEN true
            ELSE false
          END as has_simulation_session
        FROM participants p
        ORDER BY p.id, p.created_at DESC
      `);

      console.log('[Admin] Pre-simulation query returned', result.rows.length, 'participants');

      // Format the data to extract all questions and answers
      const preSimulationData = result.rows.map((row: any) => {
        // Handle demographics - could be object or already parsed
        let demographics = {};
        if (row.demographics) {
          if (typeof row.demographics === 'string') {
            try {
              demographics = JSON.parse(row.demographics);
            } catch (e) {
              console.warn('[Admin] Failed to parse demographics JSON for participant', row.id, e);
              demographics = {};
            }
          } else if (typeof row.demographics === 'object' && row.demographics !== null) {
            demographics = row.demographics;
          }
        }

        // Handle covariates - could be object or already parsed
        let covariates = {};
        if (row.covariates) {
          if (typeof row.covariates === 'string') {
            try {
              covariates = JSON.parse(row.covariates);
            } catch (e) {
              console.warn('[Admin] Failed to parse covariates JSON for participant', row.id, e);
              covariates = {};
            }
          } else if (typeof row.covariates === 'object' && row.covariates !== null) {
            covariates = row.covariates;
          }
        }

        // Extract nested structures
        const baselineStrategicDecision = (covariates as any).baselineStrategicDecision || {};
        const cognitiveReflectionTest = (covariates as any).cognitiveReflectionTest || {};

        // Extract all demographic fields with multiple possible keys
        const getDemographicValue = (key: string, altKey?: string) => {
          const value = demographics[key] || (altKey ? demographics[altKey] : null);
          return value !== undefined && value !== null && value !== '' ? value : null;
        };

        // Extract all baseline fields
        const getBaselineValue = (key: string, altKey?: string) => {
          const value = baselineStrategicDecision[key] || (altKey ? baselineStrategicDecision[altKey] : null);
          return value !== undefined && value !== null && value !== '' ? value : null;
        };

        // Extract all CRT fields
        const getCRTValue = (key: string, altKey?: string) => {
          const value = cognitiveReflectionTest[key] || (altKey ? cognitiveReflectionTest[altKey] : null);
          return value !== undefined && value !== null && value !== '' ? value : null;
        };

        const extracted = {
          id: row.id,
          participant_code: row.participant_code,
          mode: row.mode,
          participant_status: row.participant_status,
          created_at: row.created_at,
          started_at: row.started_at,
          has_simulation_session: row.has_simulation_session,
          // Demographics - try multiple possible field names
          professionalExperience: getDemographicValue('professionalExperience', 'professional_experience'),
          managementExperience: getDemographicValue('managementExperience', 'management_experience'),
          education: getDemographicValue('education'),
          age: getDemographicValue('age'),
          gender: getDemographicValue('gender'),
          industryOrStudies: getDemographicValue('industryOrStudies', 'industry_or_studies'),
          // Baseline Strategic Decision Quality - try multiple possible field names
          tradeOffs: getBaselineValue('tradeOffs', 'trade_offs'),
          strategicOptions: getBaselineValue('strategicOptions', 'strategic_options'),
          recommendation: getBaselineValue('recommendation'),
          // Cognitive Reflection Test - try multiple possible field names
          crt1: getCRTValue('question1', 'crt1'),
          crt2: getCRTValue('question2', 'crt2'),
          crt3: getCRTValue('question3', 'crt3'),
          // Raw data for debugging (only include if there's actual data)
          ...(Object.keys(demographics).length > 0 || Object.keys(covariates).length > 0 ? {
            _raw_demographics: demographics,
            _raw_covariates: covariates
          } : {})
        };

        // Log if we found data for debugging
        const hasData = extracted.professionalExperience || extracted.tradeOffs || extracted.crt1;
        if (hasData) {
          console.log('[Admin] Found pre-simulation data for participant', row.participant_code || row.id, {
            hasDemographics: !!extracted.professionalExperience,
            hasBaseline: !!extracted.tradeOffs,
            hasCRT: !!extracted.crt1
          });
        }

        return extracted;
      });

      console.log('[Admin] Returning', preSimulationData.length, 'participants with pre-simulation data');

      res.json({
        status: 'success',
        data: preSimulationData
      });
    } catch (error) {
      console.error('[Admin] Error fetching pre-simulation data:', error);
      next(error);
    }
  }
);

export default router;
