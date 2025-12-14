import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../src/db';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set for integration tests');
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set for integration tests');
}

const app = express();
app.use(express.json());

const { authMiddleware } = require('../../src/middleware/auth');
const { authorizeRoles } = require('../../src/middleware/authorize');

function signToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sweets (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price NUMERIC NOT NULL,
      quantity INT NOT NULL
    );
  `);

  // ensure users table exists from previous tests
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
  await pool.query('TRUNCATE TABLE sweets RESTART IDENTITY CASCADE');
  await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

  // seed admin and user
  await pool.query("INSERT INTO users (email, password, role) VALUES ('admin@example.com', 'x', 'ADMIN')");
  await pool.query("INSERT INTO users (email, password, role) VALUES ('user@example.com', 'x', 'USER')");
});

afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS sweets');
  await pool.end();
});

describe('Sweets API (RBAC + Auth)', () => {
  it('ADMIN can create a sweet (201)', async () => {
    // wire route
    app.post('/api/sweets', authMiddleware, authorizeRoles(['ADMIN']), (_req, res) => res.status(201).json({ id: 1, ..._req.body }));

    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app)
      .post('/api/sweets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Chocolate', category: 'Candy', price: 1.5, quantity: 10 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', 'Chocolate');
  });

  it('USER cannot create a sweet (403)', async () => {
    app.post('/api/sweets', authMiddleware, authorizeRoles(['ADMIN']), (_req, res) => res.status(201).json({}));

    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app)
      .post('/api/sweets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Marshmallow', category: 'Candy', price: 0.5, quantity: 20 });

    expect(res.status).toBe(403);
  });

  it('Missing required fields returns 400', async () => {
    app.post('/api/sweets', authMiddleware, authorizeRoles(['ADMIN']), (_req, res) => res.status(201).json({}));

    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app).post('/api/sweets').set('Authorization', `Bearer ${token}`).send({ name: 'Bad' });

    // Expect handler to validate and return 400, but currently route doesn't validate so test should fail
    expect(res.status).toBe(400);
  });

  it('ADMIN and USER can fetch sweets (200) and empty array returned when none', async () => {
    app.get('/api/sweets', authMiddleware, authorizeRoles(['ADMIN', 'USER']), (_req, res) => res.json([]));

    const tokenAdmin = signToken({ userId: 1, role: 'ADMIN' });
    const tokenUser = signToken({ userId: 2, role: 'USER' });

    const resAdmin = await request(app).get('/api/sweets').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resAdmin.status).toBe(200);
    expect(Array.isArray(resAdmin.body)).toBe(true);

    const resUser = await request(app).get('/api/sweets').set('Authorization', `Bearer ${tokenUser}`);
    expect(resUser.status).toBe(200);
    expect(Array.isArray(resUser.body)).toBe(true);
  });

  it('ADMIN can update sweet (200); USER cannot (403); updating non-existent -> 404', async () => {
    // stub route for update; in RED phase not implemented
    app.put('/api/sweets/:id', authMiddleware, authorizeRoles(['ADMIN']), (_req, res) => res.json({ id: Number(_req.params.id), ..._req.body }));

    const tokenAdmin = signToken({ userId: 1, role: 'ADMIN' });
    const tokenUser = signToken({ userId: 2, role: 'USER' });

    // Admin updating existing (we'll assume id=1 exists)
    const resAdmin = await request(app).put('/api/sweets/1').set('Authorization', `Bearer ${tokenAdmin}`).send({ name: 'Updated' });
    // Expect 200
    expect(resAdmin.status).toBe(200);

    // User cannot
    const resUser = await request(app).put('/api/sweets/1').set('Authorization', `Bearer ${tokenUser}`).send({ name: 'Bad' });
    expect(resUser.status).toBe(403);

    // Non-existent -> 404
    const resAdmin404 = await request(app).put('/api/sweets/999').set('Authorization', `Bearer ${tokenAdmin}`).send({ name: 'Nope' });
    expect(resAdmin404.status).toBe(404);
  });

  it('ADMIN can delete sweet (200 or 204); USER cannot (403); deleting non-existent -> 404', async () => {
    app.delete('/api/sweets/:id', authMiddleware, authorizeRoles(['ADMIN']), (_req, res) => res.status(200).json({ deleted: Number(_req.params.id) }));

    const tokenAdmin = signToken({ userId: 1, role: 'ADMIN' });
    const tokenUser = signToken({ userId: 2, role: 'USER' });

    const resAdmin = await request(app).delete('/api/sweets/1').set('Authorization', `Bearer ${tokenAdmin}`);
    expect([200, 204]).toContain(resAdmin.status);

    const resUser = await request(app).delete('/api/sweets/1').set('Authorization', `Bearer ${tokenUser}`);
    expect(resUser.status).toBe(403);

    const resAdmin404 = await request(app).delete('/api/sweets/999').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resAdmin404.status).toBe(404);
  });

  it('rejects missing or invalid JWT with 401', async () => {
    app.get('/api/sweets-protected', authMiddleware, authorizeRoles(['ADMIN', 'USER']), (_req, res) => res.json({ ok: true }));

    // Missing header
    const resMissing = await request(app).get('/api/sweets-protected');
    expect(resMissing.status).toBe(401);

    // Invalid token
    const resInvalid = await request(app).get('/api/sweets-protected').set('Authorization', 'Bearer bad.token');
    expect(resInvalid.status).toBe(401);
  });
});
