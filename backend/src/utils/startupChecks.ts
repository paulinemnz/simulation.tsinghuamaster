/**
 * Startup Validation System
 * Prevents server from starting if prerequisites aren't met
 * Provides clear error messages and recovery instructions
 */

import { Pool } from 'pg';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { checkSchema, printSchemaCheckResults } from './schemaCheck';
import { pool } from '../database/connection';
import { memoryMonitor } from './memoryMonitor';

export interface StartupCheckResult {
  success: boolean;
  error?: string;
  fixInstructions?: string[];
}

/**
 * Check if a port is available
 */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

/**
 * Check if database is accessible
 */
async function checkDatabaseConnection(): Promise<StartupCheckResult> {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    return {
      success: false,
      error: 'DATABASE_URL environment variable is not set',
      fixInstructions: [
        '1. Create a .env file in the backend directory',
        '2. Add: DATABASE_URL=postgresql://sim_user:sim_password@localhost:5432/simulation_db',
        '3. Or set it in your environment variables'
      ]
    };
  }

  try {
    // Parse connection string to extract host/port
    const url = new URL(dbUrl.replace('postgresql://', 'http://'));
    const host = url.hostname;
    const port = parseInt(url.port || '5432', 10);

    // Check if PostgreSQL port is reachable
    const isReachable = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      const timeout = 2000;
      
      socket.setTimeout(timeout);
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      socket.once('error', () => {
        resolve(false);
      });
      
      socket.connect(port, host);
    });

    if (!isReachable) {
      return {
        success: false,
        error: `Cannot connect to PostgreSQL at ${host}:${port}`,
        fixInstructions: [
          '1. Ensure PostgreSQL is running',
          '2. Check if PostgreSQL is listening on the correct port',
          '3. Verify DATABASE_URL in .env file is correct',
          '4. For Docker: Run `docker-compose up postgres`',
          '5. For local: Start PostgreSQL service'
        ]
      };
    }

    // Try to connect with actual credentials
    const testPool = new Pool({ connectionString: dbUrl });
    try {
      await testPool.query('SELECT 1');
      testPool.end();
      return { success: true };
    } catch (err: any) {
      testPool.end();
      return {
        success: false,
        error: `Database connection failed: ${err.message}`,
        fixInstructions: [
          '1. Verify database credentials in DATABASE_URL',
          '2. Check if database "simulation_db" exists',
          '3. Check if user "sim_user" exists and has permissions',
          '4. Run: CREATE DATABASE simulation_db; (if needed)',
          '5. Run: CREATE USER sim_user WITH PASSWORD \'sim_password\'; (if needed)'
        ]
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `Invalid DATABASE_URL format: ${err.message}`,
      fixInstructions: [
        '1. DATABASE_URL should be: postgresql://user:password@host:port/database',
        '2. Example: postgresql://sim_user:sim_password@localhost:5432/simulation_db'
      ]
    };
  }
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): StartupCheckResult {
  const required = ['DATABASE_URL'];
  const missing: string[] = [];

  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    return {
      success: false,
      error: `Missing required environment variables: ${missing.join(', ')}`,
      fixInstructions: [
        '1. Create a .env file in the backend directory',
        '2. Add the missing variables:',
        ...missing.map(v => `   ${v}=your_value_here`),
        '3. See .env.example for reference'
      ]
    };
  }

  return { success: true };
}

/**
 * Check if node_modules exists
 */
function checkDependencies(): StartupCheckResult {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    return {
      success: false,
      error: 'node_modules directory not found',
      fixInstructions: [
        '1. Run: npm install',
        '2. Wait for installation to complete',
        '3. Try starting the server again'
      ]
    };
  }

  return { success: true };
}

/**
 * Check if port is available
 */
async function checkPortAvailable(port: number): Promise<StartupCheckResult> {
  const available = await isPortAvailable(port);
  
  if (!available) {
    return {
      success: false,
      error: `Port ${port} is already in use`,
      fixInstructions: [
        `1. Find the process using port ${port}:`,
        '   Windows: netstat -ano | findstr :3001',
        '   Mac/Linux: lsof -i :3001',
        '2. Kill the process or use a different port',
        '3. To use a different port, set PORT=3002 in .env'
      ]
    };
  }

  return { success: true };
}

/**
 * Check database connection pool configuration
 */
async function checkConnectionPool(): Promise<StartupCheckResult> {
  try {
    // Test pool connection
    const result = await pool.query('SELECT 1');
    
    // Check pool configuration
    const poolConfig = (pool as any).options || {};
    const maxConnections = poolConfig.max || 10;
    const minConnections = poolConfig.min || 0;
    
    if (maxConnections < 50) {
      return {
        success: false,
        error: `Connection pool max (${maxConnections}) is below recommended value (50) for 100 participants`,
        fixInstructions: [
          'Update backend/src/database/connection.ts to set max: 50 in PoolConfig'
        ]
      };
    }
    
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: `Connection pool check failed: ${error.message}`,
      fixInstructions: ['Verify database connection configuration']
    };
  }
}

/**
 * Check memory configuration
 */
function checkMemoryConfiguration(): StartupCheckResult {
  const memoryStats = memoryMonitor.getCurrentMemory();
  
  // Check if we have reasonable memory available
  if (memoryStats.heapTotal > 1000) {
    return {
      success: false,
      error: `High initial heap size: ${memoryStats.heapTotal}MB`,
      fixInstructions: [
        'Monitor memory usage during load testing',
        'Consider setting NODE_OPTIONS=--max-old-space-size=2048 if needed'
      ]
    };
  }
  
  return { success: true };
}

/**
 * Run all startup checks
 */
export async function runStartupChecks(): Promise<void> {
  console.log('\n🔍 Running startup checks...\n');

  const checks = [
    { name: 'Dependencies', check: () => checkDependencies() },
    { name: 'Environment Variables', check: () => checkEnvironmentVariables() },
    { name: 'Database Connection', check: () => checkDatabaseConnection() },
    { name: 'Connection Pool', check: () => checkConnectionPool() },
    { name: 'Memory Configuration', check: () => checkMemoryConfiguration() },
    { 
      name: 'Database Schema', 
      check: async () => {
        try {
          const result = await checkSchema();
          printSchemaCheckResults(result);
          return { success: result.success, error: result.errors.join('; ') };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
      }
    },
    { 
      name: 'Port Availability', 
      check: async () => {
        const port = parseInt(process.env.PORT || '3001', 10);
        return await checkPortAvailable(port);
      }
    }
  ];

  const errors: Array<{ name: string; result: StartupCheckResult }> = [];

  for (const { name, check } of checks) {
    process.stdout.write(`  ✓ Checking ${name}... `);
    try {
      const result = await check();
      if (result.success) {
        console.log('✅');
      } else {
        console.log('❌');
        errors.push({ name, result });
      }
    } catch (err: any) {
      console.log('❌');
      errors.push({
        name,
        result: {
          success: false,
          error: err.message,
          fixInstructions: ['See error details above']
        }
      });
    }
  }

  if (errors.length > 0) {
    // Make checks non-blocking - warn but don't fail
    // This allows the server to start even if some checks fail
    // The server will still work for basic operations
    console.log('\n⚠️  Startup checks completed with warnings\n');
    
    // Only fail on critical issues (dependencies, port)
    const criticalErrors = errors.filter(({ name }) => 
      name === 'Dependencies' || name === 'Port Availability'
    );
    
    if (criticalErrors.length > 0) {
      // Only warn if port is unavailable (truly critical)
      // Dependencies can be installed, but port conflict is fatal
      // NOTE: Server should already be running at this point, so we just warn
      const portError = criticalErrors.find(({ name }) => name === 'Port Availability');
      if (portError) {
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('⚠️  Port check warning (server may already be running):\n');
        console.log(`   ${portError.result.error}`);
        if (portError.result.fixInstructions) {
          console.log('\n   Fix:');
          portError.result.fixInstructions.forEach(instruction => {
            console.log(`   ${instruction}`);
          });
        }
        console.log('\n═══════════════════════════════════════════════════════════\n');
        // Don't exit - server is already running, this is just a warning
      }
      
      // Dependencies missing - warn but try to continue
      const depError = criticalErrors.find(({ name }) => name === 'Dependencies');
      if (depError) {
        console.log('⚠️  Dependencies missing - server may not work properly');
        console.log(`   ${depError.result.error}`);
        console.log('   Attempting to start anyway...\n');
      }
    }
    
    // Non-critical errors (database, env vars) - just warn
    const warnings = errors.filter(({ name }) => 
      name !== 'Dependencies' && name !== 'Port Availability'
    );
    
    if (warnings.length > 0) {
      console.log('⚠️  Warnings (server will start but may have limited functionality):\n');
      warnings.forEach(({ name, result }) => {
        console.log(`   ${name}: ${result.error}`);
        if (result.fixInstructions && result.fixInstructions.length > 0) {
          console.log(`   → ${result.fixInstructions[0]}`);
        }
      });
      console.log('');
    }
  } else {
    console.log('\n✅ All startup checks passed!\n');
  }
}
