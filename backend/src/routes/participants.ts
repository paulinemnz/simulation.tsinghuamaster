import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Participant } from '../models/Participant';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get participant by ID
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

      const participant = await Participant.findById(req.params.id);
      if (!participant) {
        return res.status(404).json({ status: 'error', message: 'Participant not found' });
      }

      // Participants can only view their own data unless they're a researcher
      if (req.user?.role === 'participant' && participant.user_id !== req.user.id) {
        return res.status(403).json({ status: 'error', message: 'Access denied' });
      }

      res.json({ status: 'success', data: participant });
    } catch (error) {
      next(error);
    }
  }
);

// Get participants by session
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

      const participants = await Participant.findBySession(req.params.sessionId);
      res.json({ status: 'success', data: participants });
    } catch (error) {
      next(error);
    }
  }
);

// Create participant
router.post(
  '/',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  [
    body('user_id').isUUID().withMessage('User ID is required'),
    body('session_id').isUUID().withMessage('Session ID is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const participant = await Participant.create({
        user_id: req.body.user_id,
        session_id: req.body.session_id,
        demographics: req.body.demographics,
      });

      res.status(201).json({ status: 'success', data: participant });
    } catch (error) {
      next(error);
    }
  }
);

export default router;