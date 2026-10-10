import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('health', () => {
  it('GET /health responds with ok', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /ready reports each check', async () => {
    const response = await request(createApp()).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ready: true });
  });
});
