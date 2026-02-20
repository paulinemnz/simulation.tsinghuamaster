/**
 * Script to run the AI Attitude Responses table migration
 * Run with: npx ts-node src/database/migrations/runAiAttitudeMigration.ts
 */

import { pool } from '../connection';
import * as fs from 'fs';
import * as path from 'path';

async function runAiAttitudeMigration() {
  try {
    console.log('Running AI Attitude Responses table migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'add_ai_attitude_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSql);
    
    console.log('✓ AI Attitude Responses table migration completed successfully!');
    console.log('  Table: ai_attitude_responses');
    console.log('  Indexes created: idx_ai_attitude_session, idx_ai_attitude_participant');
    
    // Verify the table was created
    const verifyResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ai_attitude_responses'
      );
    `);
    
    if (verifyResult.rows[0].exists) {
      console.log('✓ Table verification: ai_attitude_responses exists');
    } else {
      console.error('✗ Table verification failed: ai_attitude_responses not found');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    if (error.code === '42P07') {
      console.log('  Note: Table already exists. This is okay if you\'ve run the migration before.');
    } else {
      console.error('  Error details:', error);
      process.exit(1);
    }
  }
}

runAiAttitudeMigration();
