import { pool } from './connection';

/**
 * Schema validation utility for checking database table schemas
 * Prevents runtime errors from missing columns
 */

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

/**
 * Get all columns for a table
 */
export async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const result = await pool.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );
  return result.rows;
}

/**
 * Check if a table has a specific column
 */
export async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = $1
     AND column_name = $2`,
    [tableName, columnName]
  );
  return result.rows.length > 0;
}

/**
 * Get missing columns for a table
 */
export async function getMissingColumns(
  tableName: string,
  requiredColumns: string[]
): Promise<string[]> {
  const existingColumns = await getTableColumns(tableName);
  const existingColumnNames = existingColumns.map(col => col.column_name);
  
  return requiredColumns.filter(col => !existingColumnNames.includes(col));
}

/**
 * Check if a table has all required columns
 */
export async function hasAllColumns(
  tableName: string,
  requiredColumns: string[]
): Promise<boolean> {
  const missing = await getMissingColumns(tableName, requiredColumns);
  return missing.length === 0;
}

/**
 * Validate table schema and return validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  missingColumns: string[];
  existingColumns: string[];
}

export async function validateTableSchema(
  tableName: string,
  requiredColumns: string[]
): Promise<SchemaValidationResult> {
  const existingColumns = await getTableColumns(tableName);
  const existingColumnNames = existingColumns.map(col => col.column_name);
  const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col));
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns,
    existingColumns: existingColumnNames
  };
}
