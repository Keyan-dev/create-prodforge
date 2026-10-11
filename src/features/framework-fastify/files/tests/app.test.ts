import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('app', () => {
  it('returns a JSON 404 with the request id', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatchObject({ message: 'Cannot GET /nope' });
    expect(response.json().error.requestId).toBe(response.headers['x-request-id']);
  });

  it('reuses an incoming X-Request-Id', async () => {
    const response = await createApp().inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'abc-123' },
    });

    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('sets security headers', async () => {
    const response = await createApp().inject({ method: 'GET', url: '/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
