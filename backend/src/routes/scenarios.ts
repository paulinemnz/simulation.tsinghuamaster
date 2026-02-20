import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Scenario } from '../models/Scenario';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = express.Router();

// Get all scenarios (active only for participants)
router.get(
  '/',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const activeOnly = req.user?.role === 'participant';
      const scenarios = await Scenario.findAll(activeOnly);
      res.json({ status: 'success', data: scenarios });
    } catch (error) {
      next(error);
    }
  }
);

// Get scenario by ID
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

      const scenario = await Scenario.findById(req.params.id);
      if (!scenario) {
        return res.status(404).json({ status: 'error', message: 'Scenario not found' });
      }

      res.json({ status: 'success', data: scenario });
    } catch (error) {
      next(error);
    }
  }
);

// Create scenario (researchers only)
router.post(
  '/',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('config').isObject().withMessage('Config must be an object'),
    body('config.initialState').isObject().withMessage('Initial state is required'),
    body('config.decisionCategories').isArray().withMessage('Decision categories are required'),
    body('config.outcomeRules').isArray().withMessage('Outcome rules are required'),
    body('config.rounds').isInt({ min: 1 }).withMessage('Rounds must be at least 1'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const scenario = await Scenario.create({
        name: req.body.name,
        description: req.body.description,
        config: req.body.config,
        created_by: req.user!.id,
      });

      res.status(201).json({ status: 'success', data: scenario });
    } catch (error) {
      next(error);
    }
  }
);

// Update scenario (researchers only)
router.put(
  '/:id',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  param('id').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const scenario = await Scenario.update(req.params.id, req.body);
      if (!scenario) {
        return res.status(404).json({ status: 'error', message: 'Scenario not found' });
      }

      res.json({ status: 'success', data: scenario });
    } catch (error) {
      next(error);
    }
  }
);

// Delete scenario (researchers only)
router.delete(
  '/:id',
  authenticateToken,
  requireRole(['researcher', 'admin']),
  param('id').isUUID(),
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const deleted = await Scenario.delete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ status: 'error', message: 'Scenario not found' });
      }

      res.json({ status: 'success', message: 'Scenario deleted' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;