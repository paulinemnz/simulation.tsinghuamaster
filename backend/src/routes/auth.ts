import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { User } from '../models/User';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['participant', 'researcher']).withMessage('Role must be participant or researcher'),
    body('name').optional().isString(),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ status: 'error', message: 'Email already registered' });
      }

      const user = await User.create({
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
        name: req.body.name,
      });

      const token = generateToken(user.id!);

      res.status(201).json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          },
          token,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ status: 'error', errors: errors.array() });
      }

      const user = await User.findByEmail(req.body.email);
      if (!user || !user.password_hash) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      const isValid = await User.verifyPassword(req.body.password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
      }

      const token = generateToken(user.id!);

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
          },
          token,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get(
  '/me',
  authenticateToken,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }

      res.json({
        status: 'success',
        data: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  // expiresIn must be StringValue (from ms package) or number
  // '7d' is a valid StringValue format (e.g., "7d", "1h", "30m")
  const expiresIn: StringValue | number = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;
  const options: SignOptions = { expiresIn };
  return jwt.sign({ id: userId }, secret, options);
}

export default router;