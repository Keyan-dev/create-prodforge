import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

// Signing up and in needs the database, so the e2e test covers it. These run without one.
describe('auth', () => {
  it('mounts Better Auth under /api/auth', async () => {
    const response = await createApp().request('/api/auth/ok');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('GET /auth/me requires a session', async () => {
    expect((await createApp().request('/auth/me')).status).toBe(401);
  });
});
