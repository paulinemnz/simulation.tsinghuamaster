import { pool } from '../database/connection';
import { ScenarioConfig } from '../../shared/types/scenario.types';

export interface ScenarioData {
  id?: string;
  name: string;
  description?: string;
  config: ScenarioConfig;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

export class Scenario {
  static async create(data: ScenarioData): Promise<ScenarioData> {
    const result = await pool.query(
      `INSERT INTO scenarios (name, description, config, created_by, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.name,
        data.description || null,
        JSON.stringify(data.config),
        data.created_by,
        data.is_active !== false
      ]
    );

    const row = result.rows[0];
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    };
  }

  static async findById(id: string): Promise<ScenarioData | null> {
    const result = await pool.query(
      'SELECT * FROM scenarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    };
  }

  static async findAll(activeOnly: boolean = false): Promise<ScenarioData[]> {
    const query = activeOnly
      ? 'SELECT * FROM scenarios WHERE is_active = true ORDER BY created_at DESC'
      : 'SELECT * FROM scenarios ORDER BY created_at DESC';

    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    }));
  }

  static async update(id: string, data: Partial<ScenarioData>): Promise<ScenarioData | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.config !== undefined) {
      updates.push(`config = $${paramCount++}`);
      values.push(JSON.stringify(data.config));
    }
    if (data.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(data.is_active);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE scenarios SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config
    };
  }

  static async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM scenarios WHERE id = $1',
      [id]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }
}