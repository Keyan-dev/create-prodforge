import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('health', () => {
  it('GET /health responds with ok', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('GET /ready reports each check', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ready: true });
  });
});
