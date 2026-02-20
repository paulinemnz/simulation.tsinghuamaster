/**
 * Schema validation on startup
 * Ensures database schema matches code expectations
 */

import { pool } from '../database/connection';
import { hasColumn, validateTableSchema } from '../database/schemaValidator';

export interface SchemaCheckResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Check critical schema requirements
 */
export async function checkSchema(): Promise<SchemaCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check participants table
    const participantsCheck = await validateTableSchema('participants', [
      'id', 'user_id', 'session_id', 'participant_code', 'mode', 'status', 'started_at', 'created_at'
    ]);
    
    if (!participantsCheck.isValid) {
      errors.push(`participants table missing columns: ${participantsCheck.missingColumns.join(', ')}`);
    }

    // Check for deprecated start_time column
    const hasStartTime = await hasColumn('participants', 'start_time');
    if (hasStartTime) {
      warnings.push('participants table has deprecated start_time column (should use started_at)');
    }

    // Check simulation_sessions table
    const sessionsCheck = await validateTableSchema('simulation_sessions', [
      'id', 'participant_id', 'scenario_id', 'current_round', 'total_rounds', 
      'current_act', 'status', 'mode', 'started_at', 'created_at', 'state_snapshot'
    ]);
    
    if (!sessionsCheck.isValid) {
      errors.push(`simulation_sessions table missing columns: ${sessionsCheck.missingColumns.join(', ')}`);
    }

    // Check decision_events table
    const decisionEventsCheck = await validateTableSchema('decision_events', [
      'id', 'simulation_session_id', 'participant_id', 'act_number', 
      'option_id', 'submitted_at', 'created_at'
    ]);
    
    if (!decisionEventsCheck.isValid) {
      errors.push(`decision_events table missing columns: ${decisionEventsCheck.missingColumns.join(', ')}`);
    }

    // Check act_progress table
    const actProgressCheck = await validateTableSchema('act_progress', [
      'id', 'simulation_session_id', 'act_number', 'started_at', 'submitted_at', 'created_at'
    ]);
    
    if (!actProgressCheck.isValid) {
      errors.push(`act_progress table missing columns: ${actProgressCheck.missingColumns.join(', ')}`);
    }

  } catch (error: any) {
    errors.push(`Schema check failed: ${error.message}`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Print schema check results
 */
export function printSchemaCheckResults(result: SchemaCheckResult): void {
  if (result.success && result.warnings.length === 0) {
    console.log('✅ Schema validation passed');
    return;
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Schema validation failed:');
    result.errors.forEach(error => {
      console.log(`   • ${error}`);
    });
    console.log('\n   → Run migration: npm run migrate');
    console.log('   → Or apply: backend/src/database/migrations/001_stabilize_schema.sql\n');
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Schema warnings:');
    result.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
    console.log('\n   → Consider running migration to fix deprecated columns\n');
  }
}
