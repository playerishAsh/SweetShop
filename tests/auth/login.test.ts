import request from 'supertest';
import app from '../../src/app';
import { pool } from '../../src/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Ensure test env set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for integration tests');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set for integration tests');
}

const TEST_EMAIL = 'loginuser@example.com';
const TEST_PASSWORD = 'MyP@ssw0rd!';

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER'
    );
  `);
});

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  // seed a user with hashed password
  const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
  await pool.query('INSERT INTO users (email, password, role) VALUES ($1, $2, $3)', [
    TEST_EMAIL,
    hashed,
    'USER'
  ]);
});

afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS users');
  await pool.end();
});

describe('POST /api/auth/login', () => {
  it('should login successfully and return a JWT containing userId and role (200)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    const token = res.body.token;
    expect(typeof token).toBe('string');

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    expect(decoded).toHaveProperty('userId');
    expect(decoded).toHaveProperty('role');
  });

  it('should return 401 for invalid password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: TEST_EMAIL,
      password: 'wrong-password'
    });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('token');
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'noone@example.com',
      password: 'whatever'
    });
    expect(res.status).toBe(401);
  });

  it('should never return password and not reveal which credential is incorrect', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: TEST_EMAIL,
      password: 'wrong'
    });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).toHaveProperty('error');
    // error message should be generic
    expect(res.body.error.toLowerCase()).toMatch(/invalid|unauthorized|credentials/i);
  });
});
