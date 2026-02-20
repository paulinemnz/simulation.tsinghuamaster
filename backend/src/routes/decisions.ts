import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Decision } from '../models/Decision';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Submit a decision
router.post(
  '/',
  authenticateToken,
  [
    body('simulation_session_id').isUUID().withMessage('Simulation session ID is required'),
    body('round').isInt({ min: 1 }).withMessage('Round must be at least 1'),
    body('category_id').notEmpty().withMessage('Category ID is required'),
    body('category_type').isIn(['financial', 'marketing', 'operations', 'hr', 'strategy', 'custom'])
      .withMessage('Invalid category type'),
    body('values').isObject().withMessage('Values must be an object'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const decision = await Decision.create({
        simulation_session_id: req.body.simulation_session_id,
        round: req.body.round,
        category_id: req.body.category_id,
        category_type: req.body.category_type,
        values: req.body.values,
        time_spent: req.body.time_spent,
        intermediate_changes: req.body.intermediate_changes,
      });

      // Log decision event
      await Decision.createEvent(decision.id!, 'submitted', decision.values);

      res.status(201).json({ status: 'success', data: decision });
    } catch (error) {
      next(error);
    }
  }
);

// Get decisions for a simulation session
router.get(
  '/session/:sessionId',
  authenticateToken,
  param('sessionId').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const round = req.query.round ? parseInt(req.query.round as string) : undefined;
      const decisions = await Decision.findBySession(req.params.sessionId, round);

      res.json({ status: 'success', data: decisions });
    } catch (error) {
      next(error);
    }
  }
);

// Get decision by ID
router.get(
  '/:id',
  authenticateToken,
  param('id').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const decision = await Decision.findById(req.params.id);
      if (!decision) {
        return res.status(404).json({ status: 'error', message: 'Decision not found' });
      }

      res.json({ status: 'success', data: decision });
    } catch (error) {
      next(error);
    }
  }
);

export default router;