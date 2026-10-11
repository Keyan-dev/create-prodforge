import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('health', () => {
  it('GET /health responds with ok', async () => {
    const response = await createApp().request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('GET /ready reports each check', async () => {
    const response = await createApp().request('/ready');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ready: true });
  });
});
