import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { pool } from '../../src/db';

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set for tests');

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
  await pool.query("INSERT INTO users (email, password, role) VALUES ('admin@example.com','x','ADMIN')");
  await pool.query("INSERT INTO users (email, password, role) VALUES ('user@example.com','x','USER')");
  // seed a sweet with known quantity
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('Gummy', 'Candy', 1.0, 5)");
});

afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS sweets');
  await pool.end();
});

describe('Inventory API: purchase & restock (RED)', () => {
  it('USER can purchase a sweet (200) and quantity decreases', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app)
      .post('/api/sweets/1/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(200);

    const q = await pool.query('SELECT quantity FROM sweets WHERE id = $1', [1]);
    expect(q.rows[0].quantity).toBe(3);
  });

  it('ADMIN can purchase a sweet (200)', async () => {
    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app)
      .post('/api/sweets/1/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(200);
  });

  it('Purchasing more than available stock returns 400 and quantity unchanged', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app)
      .post('/api/sweets/1/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 10 });

    expect(res.status).toBe(400);

    const q = await pool.query('SELECT quantity FROM sweets WHERE id = $1', [1]);
    expect(q.rows[0].quantity).toBe(5);
  });

  it('Purchasing when quantity is zero returns 400', async () => {
    // set quantity to zero
    await pool.query('UPDATE sweets SET quantity = 0 WHERE id = $1', [1]);
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).post('/api/sweets/1/purchase').set('Authorization', `Bearer ${token}`).send({ quantity: 1 });

    expect(res.status).toBe(400);
  });

  it('Purchasing non-existent sweet returns 404', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).post('/api/sweets/999/purchase').set('Authorization', `Bearer ${token}`).send({ quantity: 1 });

    expect(res.status).toBe(404);
  });

  it('ADMIN can restock (200) and quantity increases', async () => {
    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app).post('/api/sweets/1/restock').set('Authorization', `Bearer ${token}`).send({ quantity: 3 });

    expect(res.status).toBe(200);

    const q = await pool.query('SELECT quantity FROM sweets WHERE id = $1', [1]);
    expect(q.rows[0].quantity).toBe(8);
  });

  it('USER cannot restock (403)', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).post('/api/sweets/1/restock').set('Authorization', `Bearer ${token}`).send({ quantity: 2 });

    expect(res.status).toBe(403);
  });

  it('Restocking non-existent sweet returns 404', async () => {
    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app).post('/api/sweets/999/restock').set('Authorization', `Bearer ${token}`).send({ quantity: 2 });

    expect(res.status).toBe(404);
  });

  it('Missing or invalid JWT returns 401', async () => {
    const res1 = await request(app).post('/api/sweets/1/purchase').send({ quantity: 1 });
    expect(res1.status).toBe(401);

    const res2 = await request(app).post('/api/sweets/1/restock').set('Authorization', 'Bearer bad.token').send({ quantity: 1 });
    expect(res2.status).toBe(401);
  });

  it('Invalid quantities (<= 0) return 400', async () => {
    const admin = signToken({ userId: 1, role: 'ADMIN' });
    const res1 = await request(app).post('/api/sweets/1/purchase').set('Authorization', `Bearer ${admin}`).send({ quantity: 0 });
    expect(res1.status).toBe(400);

    const res2 = await request(app).post('/api/sweets/1/restock').set('Authorization', `Bearer ${admin}`).send({ quantity: -1 });
    expect(res2.status).toBe(400);
  });
});
