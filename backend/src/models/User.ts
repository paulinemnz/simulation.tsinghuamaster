import { pool } from '../database/connection';
import bcrypt from 'bcryptjs';

export interface UserData {
  id?: string;
  email: string;
  password_hash?: string;
  password?: string;
  role: 'participant' | 'researcher' | 'admin';
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export class User {
  static async create(data: UserData): Promise<UserData> {
    const hashedPassword = data.password 
      ? await bcrypt.hash(data.password, 10)
      : data.password_hash;

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, name, created_at, updated_at`,
      [data.email, hashedPassword, data.role, data.name || null]
    );

    return result.rows[0];
  }

  static async findByEmail(email: string): Promise<UserData | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findById(id: string): Promise<UserData | null> {
    const result = await pool.query(
      'SELECT id, email, role, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}