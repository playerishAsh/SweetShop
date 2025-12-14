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

  await pool.query("INSERT INTO users (email, password, role) VALUES ('admin@example.com','x','ADMIN')");
  await pool.query("INSERT INTO users (email, password, role) VALUES ('user@example.com','x','USER')");

  // Seed sweets
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('Gummy','Candy',1.0,10)");
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('gummi','Candy',2.0,5)");
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('Chocolate','Candy',2.5,8)");
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('Caramel','Toffee',1.25,4)");
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('CandyBar','Bar',3.0,6)");
  await pool.query("INSERT INTO sweets (name, category, price, quantity) VALUES ('Lollipop','Candy',0.75,12)");
});

afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS sweets');
  await pool.end();
});

describe('GET /api/sweets/search (RED)', () => {
  it('search by name partial, case-insensitive', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ name: 'gum' });
    expect(res.status).toBe(200);
    // should contain Gummy and gummi
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const names = res.body.map((s: any) => s.name.toLowerCase());
    expect(names).toEqual(expect.arrayContaining(['gummy', 'gummi']));
  });

  it('filter by category (case-insensitive match)', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ category: 'bar' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('CandyBar');
  });

  it('filter by price range: minPrice only', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ minPrice: 2 });
    expect(res.status).toBe(200);
    // expected to include gummi (2.0), chocolate (2.5), candybar (3.0)
    const names = res.body.map((s: any) => s.name);
    expect(names).toEqual(expect.arrayContaining(['gummi', 'Chocolate', 'CandyBar']));
  });

  it('filter by price range: maxPrice only', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ maxPrice: 1 });
    expect(res.status).toBe(200);
    const names = res.body.map((s: any) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Gummy', 'Lollipop']));
  });

  it('filter by price range: minPrice + maxPrice', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ minPrice: 1, maxPrice: 2 });
    expect(res.status).toBe(200);
    const names = res.body.map((s: any) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Gummy', 'gummi', 'Caramel']));
  });

  it('combined filters: name + category', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ name: 'candy', category: 'Bar' });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('CandyBar');
  });

  it('combined filters: category + price range', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ category: 'Candy', minPrice: 1.5, maxPrice: 3 });
    expect(res.status).toBe(200);
    const names = res.body.map((s: any) => s.name);
    expect(names).toEqual(expect.arrayContaining(['gummi', 'Chocolate']));
  });

  it('no filters returns all sweets', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(6);
  });

  it('empty result returns 200 and empty array', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ name: 'zzz' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('missing or invalid JWT -> 401', async () => {
    const res1 = await request(app).get('/api/sweets/search');
    expect(res1.status).toBe(401);

    const res2 = await request(app).get('/api/sweets/search').set('Authorization', 'Bearer bad.token');
    expect(res2.status).toBe(401);
  });

  it('role violation -> 403 for unauthorized role', async () => {
    const token = signToken({ userId: 3, role: 'GHOST' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('invalid price values -> 400', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res1 = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ minPrice: 'abc' });
    expect(res1.status).toBe(400);

    const res2 = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ maxPrice: '-1' });
    expect(res2.status).toBe(400);
  });

  it('minPrice > maxPrice -> 400', async () => {
    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/api/sweets/search').set('Authorization', `Bearer ${token}`).query({ minPrice: 5, maxPrice: 1 });
    expect(res.status).toBe(400);
  });
});
