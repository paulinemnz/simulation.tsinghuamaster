import fs from 'fs';
import path from 'path';
import { pool } from '../connection';

async function runMigrations() {
  try {
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database schema created successfully');

    const migrationsDir = path.join(__dirname);
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql') && file !== 'schema.sql')
      .sort();
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migrationSql);
      console.log(`Applied migration: ${file}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigrations();