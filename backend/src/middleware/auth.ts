import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as { id: string; role?: string; isAdmin?: boolean };

    // Handle admin tokens (created via admin login)
    if (decoded.isAdmin && decoded.id === 'admin') {
      req.user = {
        id: 'admin',
        email: 'admin@system',
        role: 'admin',
      };
      return next();
    }

    // Handle regular user tokens
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'User not found' });
    }

    req.user = {
      id: user.id!,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'error', message: 'Insufficient permissions' });
    }

    next();
  };
};