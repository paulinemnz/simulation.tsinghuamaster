import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { runStartupChecks } from './utils/startupChecks';
import { generalRateLimiter } from './middleware/rateLimiter';
import * as fs from 'fs';
import * as path from 'path';

// #region agent log
const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
try { 
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:12',message:'Server file execution started',data:{hypothesisId:'ALL',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// Load environment variables
dotenv.config();

// #region agent log
try { 
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:18',message:'After dotenv.config()',data:{hypothesisId:'ALL',hasPort:!!process.env.PORT,port:process.env.PORT,hasDatabaseUrl:!!process.env.DATABASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// Initialize server (but don't start listening yet)
const app = express();
const PORT = process.env.PORT || 3001;

// #region agent log
try { 
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:22',message:'Express app created',data:{hypothesisId:'ALL',port:PORT},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:15',message:'Server startup - checking iconv-lite locations',data:{hypothesisId:'A',nodeModulesRoot:path.resolve('node_modules'),iconvLiteRoot:fs.existsSync(path.resolve('node_modules/iconv-lite')),iconvLiteBodyParser:fs.existsSync(path.resolve('node_modules/body-parser/node_modules/iconv-lite')),encodingsRoot:fs.existsSync(path.resolve('node_modules/iconv-lite/encodings')),encodingsBodyParser:fs.existsSync(path.resolve('node_modules/body-parser/node_modules/iconv-lite/encodings'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// Middleware
app.use(helmet());

// Rate limiting - apply to all routes
app.use(generalRateLimiter.middleware());

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
// #region agent log
try { 
  // Ensure .cursor directory exists
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:23',message:'CORS middleware configured',data:{corsOrigin,hasEnvVar:!!process.env.CORS_ORIGIN},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n'); 
} catch(e) {
  // Silently ignore log write errors - don't crash the server
  // console.error('Log write error:', e);
}
// #endregion
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));
app.use(morgan('dev'));

// #region agent log
try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:69',message:'Before express.json() initialization',data:{hypothesisId:'D',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
// #endregion

try {
  // JSON body parser with size limit (10MB) to prevent memory exhaustion
  app.use(express.json({ limit: '10mb' }));
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:74',message:'express.json() initialized successfully',data:{hypothesisId:'D',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
} catch (error: any) {
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:78',message:'express.json() initialization error',data:{hypothesisId:'D',error:error?.message,stack:error?.stack,code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
  throw error;
}

try {
  // URL-encoded body parser with size limit (10MB)
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:85',message:'express.urlencoded() initialized successfully',data:{hypothesisId:'D',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
} catch (error: any) {
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:89',message:'express.urlencoded() initialization error',data:{hypothesisId:'D',error:error?.message,stack:error?.stack,code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
  throw error;
}

// Request timeout middleware (30 seconds default)
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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

// Health check
app.get('/health', (req, res) => {
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:58',message:'Health check endpoint called',data:{method:req.method,url:req.url,origin:req.headers.origin,userAgent:req.headers['user-agent']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n'); 
  } catch(e) {
    console.error('Log write error:', e);
  }
  // #endregion
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
// #region agent log
try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:124',message:'Before route imports',data:{hypothesisIds:['A','E'],timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:127',message:'Importing scenariosRouter',data:{hypothesisIds:['A','E'],route:'scenarios'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import scenariosRouter from './routes/scenarios';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:130',message:'scenariosRouter imported successfully',data:{hypothesisIds:['A','E'],route:'scenarios'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:133',message:'Importing participantsRouter',data:{hypothesisIds:['A','E'],route:'participants'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import participantsRouter from './routes/participants';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:136',message:'participantsRouter imported successfully',data:{hypothesisIds:['A','E'],route:'participants'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:139',message:'Importing decisionsRouter',data:{hypothesisIds:['A','E'],route:'decisions'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import decisionsRouter from './routes/decisions';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:142',message:'decisionsRouter imported successfully',data:{hypothesisIds:['A','E'],route:'decisions'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:145',message:'Importing analyticsRouter',data:{hypothesisIds:['A','E'],route:'analytics'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import analyticsRouter from './routes/analytics';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:148',message:'analyticsRouter imported successfully',data:{hypothesisIds:['A','E'],route:'analytics'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:151',message:'Importing authRouter',data:{hypothesisIds:['A','E'],route:'auth'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import authRouter from './routes/auth';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:154',message:'authRouter imported successfully',data:{hypothesisIds:['A','E'],route:'auth'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:157',message:'Importing simulationsRouter',data:{hypothesisIds:['A','E'],route:'simulations'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import simulationsRouter from './routes/simulations';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:160',message:'simulationsRouter imported successfully',data:{hypothesisIds:['A','E'],route:'simulations'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:163',message:'Importing actsRouter',data:{hypothesisIds:['A','E'],route:'acts'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import actsRouter from './routes/acts';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:166',message:'actsRouter imported successfully',data:{hypothesisIds:['A','E'],route:'acts'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:169',message:'Importing simulationStateRouter',data:{hypothesisId:'MODULE_RESOLUTION',route:'simulationState',cwd:process.cwd(),__dirname:__dirname,simulationStatePath:path.join(__dirname,'routes','simulationState.ts'),simulationStateExists:fs.existsSync(path.join(__dirname,'routes','simulationState.ts'))},timestamp:Date.now()})}).catch(()=>{});
try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:169',message:'Before simulationStateRouter import',data:{hypothesisId:'MODULE_RESOLUTION',route:'simulationState',cwd:process.cwd(),__dirname:__dirname,simulationStatePath:path.join(__dirname,'routes','simulationState.ts'),simulationStateExists:fs.existsSync(path.join(__dirname,'routes','simulationState.ts'))},timestamp:Date.now()})+'\n'); } catch(e) {}
// #endregion
import simulationStateRouter from './routes/simulationState';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:172',message:'simulationStateRouter imported successfully',data:{hypothesisId:'MODULE_RESOLUTION',route:'simulationState',hasRouter:!!simulationStateRouter},timestamp:Date.now()})}).catch(()=>{});
try { fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:172',message:'simulationStateRouter imported successfully',data:{hypothesisId:'MODULE_RESOLUTION',route:'simulationState',hasRouter:!!simulationStateRouter},timestamp:Date.now()})+'\n'); } catch(e) {}
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:175',message:'Importing aiRouter',data:{hypothesisIds:['A','E'],route:'ai'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import aiRouter from './routes/ai';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:178',message:'aiRouter imported successfully',data:{hypothesisIds:['A','E'],route:'ai'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:181',message:'Importing copilotRouter',data:{hypothesisIds:['A','E'],route:'copilot'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import copilotRouter from './routes/copilot';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:184',message:'copilotRouter imported successfully',data:{hypothesisIds:['A','E'],route:'copilot'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:187',message:'Importing adminRouter',data:{hypothesisIds:['A','E'],route:'admin'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
import adminRouter from './routes/admin';
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:190',message:'adminRouter imported successfully - all routes imported',data:{hypothesisIds:['A','E']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:193',message:'Before route registration',data:{hypothesisId:'B',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:196',message:'Registering authRouter',data:{hypothesisId:'B',route:'/api/auth'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
app.use('/api/auth', authRouter);
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:199',message:'authRouter registered successfully',data:{hypothesisId:'B',route:'/api/auth'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:202',message:'Registering scenariosRouter',data:{hypothesisId:'B',route:'/api/scenarios'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion
app.use('/api/scenarios', scenariosRouter);
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:205',message:'scenariosRouter registered successfully',data:{hypothesisId:'B',route:'/api/scenarios'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

app.use('/api/participants', participantsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/simulations', simulationsRouter);
app.use('/api/sim', actsRouter);
app.use('/api/sim', simulationStateRouter);
app.use('/api/ai', aiRouter);
app.use('/api/copilot', copilotRouter);
app.use('/api/admin', adminRouter);
// #region agent log
fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:217',message:'All routes registered successfully',data:{hypothesisId:'B'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
// #endregion

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// #region agent log
try { 
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:150',message:'Before app.listen() call',data:{hypothesisId:'2',port:PORT},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// Start server immediately - checks run in background but don't block
// This ensures the server ALWAYS starts, even if checks fail
try {
  app.listen(PORT, () => {
    console.log(`\n✅ Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
    // #region agent log
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    const dbUrlPreview = dbUrl !== 'NOT_SET' ? (dbUrl.substring(0, 50) + '...') : 'NOT_SET';
    try { 
      fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:160',message:'Server listen callback executed - SERVER IS RUNNING',data:{hypothesisId:'2',port:PORT,nodeEnv:process.env.NODE_ENV || 'development',corsOrigin:process.env.CORS_ORIGIN || 'http://localhost:3000',hasDatabaseUrl:!!process.env.DATABASE_URL,databaseUrlPreview:dbUrlPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
    } catch(e) {
      console.error('Log write error:', e);
    }
    // #endregion
  }).on('error', (error: any) => {
    // #region agent log
    try { 
      fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:168',message:'app.listen() error event',data:{hypothesisId:'2',error:error?.message,code:error?.code,errno:error?.errno,syscall:error?.syscall,port:PORT},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
    } catch(e) {}
    // #endregion
    console.error('Server listen error:', error);
  });
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:175',message:'app.listen() called successfully (no immediate error)',data:{hypothesisId:'2',port:PORT},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
} catch (error: any) {
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:180',message:'app.listen() threw synchronous error',data:{hypothesisId:'2',error:error?.message,stack:error?.stack,code:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
  console.error('Failed to start server:', error);
  process.exit(1);
}

// #region agent log
try { 
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:190',message:'Before runStartupChecks()',data:{hypothesisId:'4'},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// Run startup checks in background (non-blocking, informational only)
// Server is already running, checks just provide info
runStartupChecks().catch((error: any) => {
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:195',message:'runStartupChecks() error',data:{hypothesisId:'4',error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
  // Silently ignore check failures - server is already running
});

// #region agent log
try { 
  fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:202',message:'Server file execution completed (reached end of file)',data:{hypothesisId:'ALL'},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
} catch(e) {}
// #endregion

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:209',message:'Unhandled promise rejection',data:{hypothesisId:'4',reason:reason?.message || String(reason),stack:reason?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/136ed832-bb29-49e3-961b-4484d95c4711',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:232',message:'Uncaught exception',data:{hypothesisId:'C',error:error?.message,stack:error?.stack,name:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})}).catch(()=>{});
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:233',message:'Uncaught exception',data:{hypothesisId:'C',error:error?.message,stack:error?.stack,name:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle process exit
process.on('exit', (code: number) => {
  // #region agent log
  try { 
    fs.appendFileSync(logPath, JSON.stringify({location:'server.ts:226',message:'Process exiting',data:{hypothesisId:'ALL',code},timestamp:Date.now(),sessionId:'debug-session',runId:'startup-debug'})+'\n'); 
  } catch(e) {}
  // #endregion
});
