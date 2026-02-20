/**
 * Diagnostic Tool
 * Run this to check system health and get troubleshooting info
 * Usage: npm run diagnose
 */

import { runStartupChecks } from './startupChecks';
import { pool } from '../database/connection';
import * as fs from 'fs';
import * as path from 'path';

export async function runDiagnostics() {
  console.log('\n🔧 System Diagnostics\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Environment Info
  console.log('📋 Environment:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   PORT: ${process.env.PORT || '3001 (default)'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
  console.log('');

  // Check .env file
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env file exists');
  } else {
    console.log('❌ .env file not found');
    console.log('   Create one in the backend directory');
  }
  console.log('');

  // Run startup checks
  try {
    await runStartupChecks();
  } catch (err: any) {
    console.error('Startup checks failed:', err.message);
  }

  // Database schema check
  console.log('📊 Database Schema Check:');
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`   Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  console.log('');

  // Check critical tables
  const criticalTables = ['participants', 'simulation_sessions', 'decision_events'];
  console.log('🔍 Critical Tables:');
  for (const table of criticalTables) {
    try {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ✅ ${table}: ${result.rows[0].count} rows`);
    } catch (err: any) {
      console.log(`   ❌ ${table}: ${err.message}`);
    }
  }
  console.log('');

  // Check for started_at column
  console.log('🔍 Schema Validation:');
  try {
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'participants' 
      AND column_name IN ('started_at', 'start_time')
    `);
    const columns = result.rows.map(r => r.column_name);
    if (columns.includes('started_at')) {
      console.log('   ✅ participants.started_at exists');
    } else if (columns.includes('start_time')) {
      console.log('   ⚠️  participants.start_time exists (should be started_at)');
      console.log('   → Run migration: fix_start_time_column.sql');
    } else {
      console.log('   ❌ Neither started_at nor start_time found');
    }
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ Diagnostics complete\n');

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  runDiagnostics().catch(err => {
    console.error('Diagnostics failed:', err);
    process.exit(1);
  });
}
