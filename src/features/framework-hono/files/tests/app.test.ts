import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('app', () => {
  it('returns a JSON 404 with the request id', async () => {
    const response = await createApp().request('/nope');
    const body = (await response.json()) as { error: { message: string; requestId: string } };

    expect(response.status).toBe(404);
    expect(body.error).toMatchObject({ message: 'Cannot GET /nope' });
    expect(body.error.requestId).toBe(response.headers.get('x-request-id'));
  });

  it('reuses an incoming X-Request-Id', async () => {
    const response = await createApp().request('/health', {
      headers: { 'x-request-id': 'abc-123' },
    });

    expect(response.headers.get('x-request-id')).toBe('abc-123');
  });

  it('sets security headers', async () => {
    const response = await createApp().request('/health');

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-powered-by')).toBeNull();
  });
});
