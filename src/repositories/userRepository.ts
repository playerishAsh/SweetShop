import { pool } from '../db';

export interface UserRecord {
  id: number;
  email: string;
  password: string;
  role: string;
}

export async function createUser(email: string, password: string, role = 'USER'): Promise<UserRecord> {
  const res = await pool.query(
    'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, password, role',
    [email, password, role]
  );
  return res.rows[0];
}

export async function findByEmail(email: string): Promise<UserRecord | null> {
  const res = await pool.query('SELECT id, email, password, role FROM users WHERE email = $1', [email]);
  return res.rows[0] ?? null;
}
