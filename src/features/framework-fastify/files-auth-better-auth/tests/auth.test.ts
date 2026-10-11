import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

// Signing up and in needs the database, so the e2e test covers it. These run without one.
describe('auth', () => {
  it('mounts Better Auth under /api/auth', async () => {
    const response = await createApp().inject('/api/auth/ok');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('GET /auth/me requires a session', async () => {
    expect((await createApp().inject('/auth/me')).statusCode).toBe(401);
  });
});
