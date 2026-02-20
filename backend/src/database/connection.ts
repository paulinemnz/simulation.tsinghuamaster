import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// #region agent log
const logPath = path.join(process.cwd(), '.cursor', 'debug.log');
try {
  const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
  const hasDbUrl = !!process.env.DATABASE_URL;
  const dbUrlPreview = hasDbUrl ? (dbUrl.substring(0, 30) + '...') : 'NOT_SET';
  fs.appendFileSync(logPath, JSON.stringify({location:'connection.ts:12',message:'Database connection config',data:{hypothesisId:'B',hasDatabaseUrl:hasDbUrl,databaseUrlPreview:dbUrlPreview,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n');
} catch(e) {}
// #endregion

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Only enable SSL if explicitly set and not connecting to localhost/Docker postgres
  ssl: process.env.DATABASE_SSL === 'true' && !process.env.DATABASE_URL?.includes('localhost') && !process.env.DATABASE_URL?.includes('postgres:') 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool configuration for 100 concurrent participants
  max: 50, // Maximum number of clients in the pool
  min: 5, // Minimum number of clients to maintain
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
};

export const pool = new Pool(config);

// Log pool statistics for monitoring
pool.on('connect', (client) => {
  console.log(`[DB Pool] Client connected. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('acquire', (client) => {
  console.log(`[DB Pool] Client acquired. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('remove', (client) => {
  console.log(`[DB Pool] Client removed. Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'connection.ts:25',message:'Database connection established',data:{hypothesisId:'D',timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
});

pool.on('error', (err: any) => {
  console.error('Unexpected error on idle client', err);
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'connection.ts:30',message:'Database pool error',data:{hypothesisId:'D',errorMessage:err?.message,errorCode:err?.code,errorName:err?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
};