import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import type { AuthRequest } from './auth';

const parseCookies = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rest] = part.trim().split('=');
    acc[rawKey] = decodeURIComponent(rest.join('='));
    return acc;
  }, {} as Record<string, string>);
};

export const authenticateAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, secret) as { id: string };
      const user = await User.findById(decoded.id);
      if (user && user.role === 'admin') {
        req.user = {
          id: user.id!,
          email: user.email,
          role: user.role
        };
        return next();
      }
    }

    const cookies = parseCookies(req.headers.cookie);
    const adminCookie = cookies.isAdmin;
    if (adminCookie && process.env.ADMIN_SECRET) {
      const decoded = jwt.verify(adminCookie, process.env.ADMIN_SECRET) as { role?: string };
      if (decoded?.role === 'admin') {
        req.user = {
          id: 'admin-secret',
          email: 'admin@secret',
          role: 'admin'
        };
        return next();
      }
    }

    return res.status(401).json({ status: 'error', message: 'Admin authentication required' });
  } catch (error) {
    return res.status(403).json({ status: 'error', message: 'Invalid or expired admin session' });
  }
};
