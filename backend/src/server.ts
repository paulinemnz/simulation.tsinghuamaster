import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { runStartupChecks } from './utils/startupChecks';
import { generalRateLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

// Initialize server (but don't start listening yet)
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(helmet());

// Rate limiting - apply to all routes
app.use(generalRateLimiter.middleware());

// CORS configuration - allow frontend origin and requests through nginx proxy
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
const allowedOrigins = corsOrigin.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests through nginx)
    if (!origin) {
      return callback(null, true);
    }
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed))) {
      return callback(null, true);
    }
    // For production, also allow Railway frontend domains
    if (process.env.NODE_ENV === 'production' && origin.includes('.railway.app')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// #region agent log
app.use((req, res, next) => {
  if (req.path.includes('start-with-mode') || req.originalUrl.includes('start-with-mode')) {
    const fs = require('fs');
    const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'server.ts:28',
      message: 'CORS middleware - start-with-mode request',
      data: { method: req.method, path: req.path, originalUrl: req.originalUrl, origin: req.headers.origin },
      runId: 'debug-405',
      hypothesisId: 'C'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  }
  next();
});
// #endregion
// Request logging - log ALL incoming requests to debug routing issues
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[REQUEST ${timestamp}] ${req.method} ${req.path} from ${req.ip || 'unknown'}`);
  console.log(`[REQUEST ${timestamp}] Headers:`, JSON.stringify(req.headers));
  next();
});
app.use(morgan('combined'));

try {
  // JSON body parser with size limit (10MB) to prevent memory exhaustion
  app.use(express.json({ limit: '10mb' }));
} catch (error: any) {
  throw error;
}

try {
  // URL-encoded body parser with size limit (10MB)
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
} catch (error: any) {
  throw error;
}

// Request timeout middleware (30 seconds default)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // #region agent log
  if (req.path.includes('start-with-mode') || req.originalUrl.includes('start-with-mode')) {
    const fs = require('fs');
    const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'server.ts:46',
      message: 'Request middleware - start-with-mode detected',
      data: { method: req.method, path: req.path, originalUrl: req.originalUrl, url: req.url },
      runId: 'debug-405',
      hypothesisId: 'C'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  }
  // #endregion
  const timeout = 30000; // 30 seconds
  req.setTimeout(timeout, () => {
    if (!res.headersSent) {
      res.status(408).json({ 
        status: 'error', 
        message: 'Request timeout - the server took too long to process your request' 
      });
    }
  });
  next();
});

// Health check endpoints - must be defined before error handlers
// Railway checks both / and /health
app.get('/health', (req, res) => {
  console.log('[HEALTH] /health endpoint called');
  // #region agent log
  const fs = require('fs');
  const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
  const logEntry = JSON.stringify({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: 'server.ts:/health',
    message: 'Health endpoint called',
    data: { 
      method: req.method, 
      path: req.path, 
      originalUrl: req.originalUrl, 
      headers: { host: req.headers.host, 'user-agent': req.headers['user-agent'], origin: req.headers.origin, referer: req.headers.referer },
      ip: req.ip,
      ips: req.ips
    },
    runId: '503-debug',
    hypothesisId: 'B'
  }) + '\n';
  try { fs.appendFileSync(logPath, logEntry, 'utf8'); } catch (e) {}
  // #endregion
  try {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error('[HEALTH] Error in health check:', error);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

// Root endpoint for Railway health checks
app.get('/', (req, res) => {
  console.log('[HEALTH] Root / endpoint called');
  // #region agent log
  const fs = require('fs');
  const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
  const logEntry = JSON.stringify({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: 'server.ts:/',
    message: 'Root endpoint called',
    data: { 
      method: req.method, 
      path: req.path, 
      originalUrl: req.originalUrl, 
      headers: { host: req.headers.host, 'user-agent': req.headers['user-agent'], origin: req.headers.origin, referer: req.headers.referer },
      ip: req.ip,
      ips: req.ips
    },
    runId: '503-debug',
    hypothesisId: 'B'
  }) + '\n';
  try { fs.appendFileSync(logPath, logEntry, 'utf8'); } catch (e) {}
  // #endregion
  try {
    res.json({ 
      status: 'ok', 
      message: 'Backend is running',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[HEALTH] Error in root endpoint:', error);
    res.status(500).json({ status: 'error', message: 'Service unavailable' });
  }
});

// Debug endpoint to test start-with-mode
app.post('/api/debug/test-start', async (req, res) => {
  try {
    const { participant_id, mode } = req.body;
    console.log('[DEBUG] Test start endpoint called:', { participant_id, mode });
    res.json({ 
      ok: true, 
      message: 'Debug endpoint working',
      received: { participant_id, mode }
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// API Routes
import scenariosRouter from './routes/scenarios';
import participantsRouter from './routes/participants';
import decisionsRouter from './routes/decisions';
import analyticsRouter from './routes/analytics';
import authRouter from './routes/auth';
import simulationsRouter from './routes/simulations';
import actsRouter from './routes/acts';
import simulationStateRouter from './routes/simulationState';
import aiRouter from './routes/ai';
import copilotRouter from './routes/copilot';
import adminRouter from './routes/admin';

app.use('/api/auth', authRouter);
app.use('/api/scenarios', scenariosRouter);

app.use('/api/participants', participantsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/analytics', analyticsRouter);
// #region agent log
app.use('/api/simulations', (req, res, next) => {
  const fs = require('fs');
  const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
  const logEntry = JSON.stringify({
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    location: 'server.ts:98',
    message: 'Request to /api/simulations router',
    data: { method: req.method, path: req.path, originalUrl: req.originalUrl, url: req.url },
    runId: 'debug-405',
    hypothesisId: 'A'
  }) + '\n';
  fs.appendFileSync(logPath, logEntry, 'utf8');
  next();
});
// #endregion
app.use('/api/simulations', simulationsRouter);
// Also mount at /simulations (without /api) for direct frontend access
// This handles requests like POST /simulations/start-with-mode
app.use('/simulations', simulationsRouter);
app.use('/api/sim', actsRouter);
app.use('/api/sim', simulationStateRouter);
app.use('/api/ai', aiRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/admin', adminRouter);

// Debug: Log all unmatched requests before 404 handler
// #region agent log
app.use((req, res, next) => {
  if (req.path.includes('start-with-mode') || req.originalUrl.includes('start-with-mode')) {
    const fs = require('fs');
    const logPath = 'c:\\Pauline\\qinghua\\year three\\thesis\\mid thesis defense\\Cursor 2\\.cursor\\debug.log';
    const logEntry = JSON.stringify({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      location: 'server.ts:106',
      message: 'Unmatched request reached error handler',
      data: { method: req.method, path: req.path, originalUrl: req.originalUrl, url: req.url, routeMatched: false },
      runId: 'debug-405',
      hypothesisId: 'A'
    }) + '\n';
    fs.appendFileSync(logPath, logEntry, 'utf8');
  }
  next();
});
// #endregion

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server immediately - checks run in background but don't block
// This ensures the server ALWAYS starts, even if checks fail
console.log(`[STARTUP] Attempting to start server on port ${PORT}...`);
console.log(`[STARTUP] PORT environment variable: ${process.env.PORT}`);
console.log(`[STARTUP] NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

try {
  // Listen on 0.0.0.0 to accept connections from Railway's network
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`   Server address: ${JSON.stringify(server.address())}\n`);
  });
  
  server.on('error', (error: any) => {
    console.error('[STARTUP ERROR] Server listen error:', error);
    console.error('[STARTUP ERROR] Error code:', error.code);
    console.error('[STARTUP ERROR] Error message:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`[STARTUP ERROR] Port ${PORT} is already in use`);
    }
    process.exit(1);
  });
  
  server.on('listening', () => {
    const addr = server.address();
    console.log(`[STARTUP] Server is listening on:`, addr);
    console.log(`[STARTUP] Server is ready to accept connections`);
    console.log(`[STARTUP] Test health: curl http://localhost:${PORT}/health`);
  });
  
  // Ensure server is actually ready
  server.on('connection', (socket) => {
    console.log(`[CONNECTION] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  });
  
} catch (error: any) {
  console.error('[STARTUP ERROR] Failed to start server:', error);
  console.error('[STARTUP ERROR] Error stack:', error.stack);
  process.exit(1);
}

// Run startup checks in background (non-blocking, informational only)
// Server is already running, checks just provide info
runStartupChecks().catch((error: any) => {
  // Silently ignore check failures - server is already running
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[ERROR] Unhandled Rejection at:', promise);
  console.error('[ERROR] Reason:', reason);
  console.error('[ERROR] Stack:', reason?.stack);
  // Don't exit - let the server continue running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  console.error('[FATAL] Stack:', error.stack);
  // Exit on uncaught exceptions as they indicate serious problems
  process.exit(1);
});

// Handle process exit
process.on('exit', (code: number) => {
});
