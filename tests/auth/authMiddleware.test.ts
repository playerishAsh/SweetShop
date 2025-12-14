import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../../src/db';

// Ensure env
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set for integration tests');
}

// Create a small app just for middleware tests to avoid touching global app
const app = express();
app.use(express.json());

// Lazy import middleware to ensure it gets required when we call tests (RED should fail)
let authMiddleware: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  authMiddleware = require('../../src/middleware/auth').authMiddleware;
} catch (e) {
  // will be undefined during RED
}

// Protected route will be registered in tests when middleware exists

describe('JWT auth middleware', () => {
  it('rejects missing Authorization header with 401', async () => {
    // register a dummy route that uses middleware if available
    if (authMiddleware) app.get('/test/protected', authMiddleware, (_req: Request, res: Response) => res.json({ ok: true }));

    const res = await request(app).get('/test/protected');
    expect(res.status).toBe(401);
  });

  it('rejects malformed Authorization header with 401', async () => {
    if (authMiddleware) app.get('/test/malformed', authMiddleware, (_req: Request, res: Response) => res.json({ ok: true }));

    const res = await request(app).get('/test/malformed').set('Authorization', 'BadHeader token');
    expect(res.status).toBe(401);
  });

  it('rejects invalid JWT with 401 and no leak', async () => {
    if (authMiddleware) app.get('/test/invalid', authMiddleware, (_req: Request, res: Response) => res.json({ ok: true }));

    const res = await request(app).get('/test/invalid').set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.toLowerCase()).not.toMatch(/jwt|token|error/i);
  });

  it('allows valid JWT and attaches req.user', async () => {
    // Sign a token for userId=1 and role='USER'
    const token = jwt.sign({ userId: 1, role: 'USER' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });

    // middleware must be present
    if (!authMiddleware) throw new Error('authMiddleware not implemented');

    // Verify middleware attaches req.user and allows request
    app.get('/test/ok', authMiddleware, (req: Request, res: Response) => {
      // @ts-ignore
      res.json({ user: (req as any).user });
    });

    const res = await request(app).get('/test/ok').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('userId');
    expect(res.body.user).toHaveProperty('role');
  });
});
