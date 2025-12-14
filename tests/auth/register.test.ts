import request from 'supertest';
import app from '../../src/app';
import { pool } from '../../src/db';
import bcrypt from 'bcrypt';

const TEST_EMAIL = 'tuser@example.com';
const TEST_PASSWORD = 's3cret!';

beforeAll(async () => {
  // Ensure table exists for tests
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
});

afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS users');
  await pool.end();
});

describe('POST /api/auth/register', () => {
  it('should register a user successfully (201) and not return password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', TEST_EMAIL);
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).toHaveProperty('role', 'USER');

    // Check stored password is not plaintext
    const row = await pool.query('SELECT password FROM users WHERE email = $1', [TEST_EMAIL]);
    expect(row.rows.length).toBe(1);
    const storedPassword = row.rows[0].password;
    expect(storedPassword).not.toBe(TEST_PASSWORD);

    // Ensure the hashed password matches the plaintext via bcrypt.compare
    const match = await bcrypt.compare(TEST_PASSWORD, storedPassword);
    expect(match).toBe(true);
  });

  it('should return 409 for duplicate email', async () => {
    // Create first
    const res1 = await request(app).post('/api/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    expect(res1.status).toBe(201);

    // Attempt duplicate
    const res2 = await request(app).post('/api/auth/register').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    expect(res2.status).toBe(409);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      password: TEST_PASSWORD
    });
    expect(res.status).toBe(400);
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: TEST_EMAIL
    });
    expect(res.status).toBe(400);
  });
});
