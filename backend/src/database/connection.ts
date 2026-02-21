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

// Determine if SSL is required
// Railway PostgreSQL and other cloud providers require SSL
const dbUrl = process.env.DATABASE_URL || '';
const isRailway = dbUrl.includes('.railway.app') || dbUrl.includes('railway');
const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('postgres:5432');
const requiresSSL = process.env.DATABASE_SSL === 'true' || (isRailway && !isLocalhost);

// #region agent log
try {
  const sslStatus = requiresSSL ? 'enabled' : 'disabled';
  const dbUrlPreview = dbUrl ? (dbUrl.substring(0, 50) + '...') : 'NOT_SET';
  fs.appendFileSync(logPath, JSON.stringify({location:'connection.ts:config',message:'Database connection config',data:{hypothesisId:'A',hasDatabaseUrl:!!dbUrl,isRailway,isLocalhost,requiresSSL,sslStatus,databaseUrlPreview:dbUrlPreview,databseSslEnv:process.env.DATABASE_SSL},timestamp:Date.now(),sessionId:'debug-session',runId:'503-debug'})+'\n');
} catch(e) {}
// #endregion

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Enable SSL for Railway and other cloud providers that require it
  ssl: requiresSSL 
    ? { rejectUnauthorized: false } 
    : false,
  // Connection pool configuration for 100 concurrent participants
  max: 50, // Maximum number of clients in the pool
  min: 0, // Minimum number of clients - start with 0 to avoid blocking on startup if DB is unavailable
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
  console.error('Unexpected error on idle database client', err);
  // #region agent log
  try { fs.appendFileSync(logPath, JSON.stringify({location:'connection.ts:error',message:'Database pool error',data:{hypothesisId:'D',errorMessage:err?.message,errorCode:err?.code,errorName:err?.name,errorStack:err?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1'})+'\n'); } catch(e) {}
  // #endregion
  // Don't kill the server on connection errors - let it retry
  // Only exit on critical errors that indicate the database is permanently unavailable
  // Connection errors will be handled by individual queries with proper error handling
  if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
    console.error('Database connection error - server will continue but database operations may fail');
  } else {
    console.error('Database pool error - server will continue but database operations may fail');
  }
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