import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

// Signing up and in needs the database, so the e2e test covers it. These run without one.
describe('auth', () => {
  it('mounts Better Auth under /api/auth', async () => {
    const response = await request(createApp()).get('/api/auth/ok');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('GET /auth/me requires a session', async () => {
    expect((await request(createApp()).get('/auth/me')).status).toBe(401);
  });
});
