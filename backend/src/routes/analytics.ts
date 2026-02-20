import express from 'express';
import { param, query, validationResult } from 'express-validator';
import { pool } from '../database/connection';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get analytics for a research session
router.get(
  '/session/:sessionId',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  param('sessionId').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const sessionId = req.params.sessionId;

      // Get participant statistics
      const participantsResult = await pool.query(
        `SELECT COUNT(*) as total, 
                COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
         FROM participants 
         WHERE session_id = $1`,
        [sessionId]
      );

      // Get decision statistics
      const decisionsResult = await pool.query(
        `SELECT COUNT(*) as total_decisions,
                AVG(time_spent) as avg_time_spent,
                AVG(intermediate_changes) as avg_changes
         FROM decisions d
         JOIN simulation_sessions ss ON d.simulation_session_id = ss.id
         JOIN participants p ON ss.participant_id = p.id
         WHERE p.session_id = $1`,
        [sessionId]
      );

      // Get outcome statistics
      const outcomesResult = await pool.query(
        `SELECT 
                AVG((metrics->>'financials'->>'revenue')::numeric) as avg_revenue,
                AVG((metrics->>'financials'->>'profit')::numeric) as avg_profit,
                AVG((metrics->>'marketPosition'->>'marketShare')::numeric) as avg_market_share
         FROM outcomes o
         JOIN simulation_sessions ss ON o.simulation_session_id = ss.id
         JOIN participants p ON ss.participant_id = p.id
         WHERE p.session_id = $1`,
        [sessionId]
      );

      res.json({
        status: 'success',
        data: {
          participants: participantsResult.rows[0],
          decisions: decisionsResult.rows[0],
          outcomes: outcomesResult.rows[0],
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Export data for a research session
router.get(
  '/session/:sessionId/export',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  param('sessionId').isUUID(),
  query('format').optional().isIn(['csv', 'json']),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const sessionId = req.params.sessionId;
      const format = (req.query.format as string) || 'json';

      // Get all data for the session
      const result = await pool.query(
        `SELECT 
                p.id as participant_id,
                p.participant_code,
                ss.id as simulation_session_id,
                ss.current_round,
                d.round as decision_round,
                d.category_id,
                d.category_type,
                d.values as decision_values,
                d.time_spent,
                d.intermediate_changes,
                d.submitted_at,
                o.metrics as outcome_metrics,
                o.state_snapshot
         FROM participants p
         JOIN simulation_sessions ss ON ss.participant_id = p.id
         LEFT JOIN decisions d ON d.simulation_session_id = ss.id
         LEFT JOIN outcomes o ON o.simulation_session_id = ss.id AND o.round = d.round
         WHERE p.session_id = $1
         ORDER BY p.id, d.round, d.submitted_at`,
        [sessionId]
      );

      if (format === 'csv') {
        // Simple CSV conversion (in production, use a proper CSV library)
        const csv = convertToCSV(result.rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=session_${sessionId}.csv`);
        res.send(csv);
      } else {
        res.json({ status: 'success', data: result.rows });
      }
    } catch (error) {
      next(error);
    }
  }
);

function convertToCSV(rows: any[]): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csvRows = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return String(value || '').replace(/"/g, '""');
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}

export default router;