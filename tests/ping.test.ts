import request from 'supertest';
import app from '../src/app';

describe('GET /ping (TDD demo)', () => {
  it('returns pong true', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });
});
