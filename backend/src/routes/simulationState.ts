/**
 * API routes for simulation state management
 * Provides event-sourcing style state reconstruction
 */

import express from 'express';
import { param, validationResult } from 'express-validator';
import { SimulationSession } from '../models/SimulationSession';
import { DecisionEvent } from '../models/DecisionEvent';
import { pool } from '../database/connection';
import { rebuildStateFromEvents, SimulationEvent } from '../../../shared/types/simulation.types';

const router = express.Router();

/**
 * GET /api/sim/:sessionId/state
 * Rebuild simulation state from events (event sourcing)
 */
router.get(
  '/:sessionId/state',
  [
    param('sessionId').isUUID().withMessage('Invalid session ID'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;

      // Get session
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          status: 'error',
          message: 'Simulation session not found'
        });
      }

      // Get all decision events
      const decisionEvents = await DecisionEvent.findBySession(sessionId);

      // Convert to SimulationEvent format
      const events: SimulationEvent[] = decisionEvents.map(de => ({
        timestamp: de.submitted_at || de.created_at || new Date().toISOString(),
        type: 'decision',
        act: de.act_number as 1 | 2 | 3 | 4,
        payload: {
          optionId: de.option_id,
          decisionTimeMs: de.decision_time_ms,
          confidence: de.confidence
        }
      }));

      // Rebuild state from events
      const state = rebuildStateFromEvents(
        session.participant_id,
        sessionId,
        (session.mode as 'C0' | 'C1' | 'C2') || 'C0',
        session.started_at || session.created_at || new Date().toISOString(),
        events
      );

      // Update currentAct to match session
      state.currentAct = (session.current_act || 1) as 1 | 2 | 3 | 4;

      res.json({
        status: 'success',
        data: {
          state,
          session: {
            id: session.id,
            status: session.status,
            mode: session.mode,
            currentAct: session.current_act
          }
        }
      });
    } catch (error: any) {
      next(error);
    }
  }
);

/**
 * POST /api/sim/:sessionId/state/snapshot
 * Save state snapshot to localStorage backup (called from frontend)
 */
router.post(
  '/:sessionId/state/snapshot',
  [
    param('sessionId').isUUID().withMessage('Invalid session ID'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request parameters',
          errors: errors.array()
        });
      }

      const { sessionId } = req.params;
      const { stateSnapshot } = req.body;

      // Verify session exists
      const session = await SimulationSession.findById(sessionId);
      if (!session) {
        return res.status(404).json({
          status: 'error',
          message: 'Simulation session not found'
        });
      }

      // Store snapshot in session state_snapshot
      await SimulationSession.update(sessionId, {
        state_snapshot: stateSnapshot
      });

      res.json({
        status: 'success',
        message: 'State snapshot saved'
      });
    } catch (error: any) {
      next(error);
    }
  }
);

export default router;
