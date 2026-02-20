/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair resource usage
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  private getKey(req: Request): string {
    // Use IP address as the key
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `rate_limit:${ip}`;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      // Get or create entry
      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 0,
          resetTime: now + this.windowMs
        };
      }
      
      // Increment count
      this.store[key].count++;
      
      // Check if limit exceeded
      if (this.store[key].count > this.maxRequests) {
        const resetTime = new Date(this.store[key].resetTime).toISOString();
        res.status(429).json({
          status: 'error',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000),
          resetTime
        });
        return;
      }
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - this.store[key].count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(this.store[key].resetTime).toISOString());
      
      next();
    };
  }
}

// Create rate limiters for different endpoints
export const generalRateLimiter = new RateLimiter(60000, 100); // 100 requests per minute
export const authRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute for auth
export const apiRateLimiter = new RateLimiter(60000, 200); // 200 requests per minute for API calls
