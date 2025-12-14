import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set for integration tests');
}

// parent app for tests
const app = express();
app.use(express.json());

// import existing auth middleware
const { authMiddleware } = require('../../src/middleware/auth');

let authorizeRoles: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  authorizeRoles = require('../../src/middleware/authorize').authorizeRoles;
} catch (e) {
  // will cause tests to fail until implemented
}

function signToken(payload: object) {
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '1h' });
}

describe('RBAC authorizeRoles middleware', () => {
  it('returns 403 when USER accesses ADMIN-only route', async () => {
    if (!authorizeRoles) throw new Error('authorizeRoles not implemented');

    app.get('/rbac/admin-only', authMiddleware, authorizeRoles(['ADMIN']), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const token = signToken({ userId: 2, role: 'USER' });
    const res = await request(app).get('/rbac/admin-only').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.toLowerCase()).not.toMatch(/admin|user|role/);
  });

  it('allows ADMIN to access ADMIN-only route (200)', async () => {
    if (!authorizeRoles) throw new Error('authorizeRoles not implemented');

    app.get('/rbac/admin-ok', authMiddleware, authorizeRoles(['ADMIN']), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const token = signToken({ userId: 1, role: 'ADMIN' });
    const res = await request(app).get('/rbac/admin-ok').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('allows USER to access USER-allowed route (200)', async () => {
    if (!authorizeRoles) throw new Error('authorizeRoles not implemented');

    app.get('/rbac/user-ok', authMiddleware, authorizeRoles(['USER']), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const token = signToken({ userId: 5, role: 'USER' });
    const res = await request(app).get('/rbac/user-ok').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('returns 403 when req.user is missing', async () => {
    if (!authorizeRoles) throw new Error('authorizeRoles not implemented');

    // route without authMiddleware to simulate missing req.user
    app.get('/rbac/no-user', authorizeRoles(['ADMIN']), (_req: Request, res: Response) => {
      res.json({ ok: true });
    });

    const res = await request(app).get('/rbac/no-user');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.toLowerCase()).not.toMatch(/admin|user|role/);
  });
});
