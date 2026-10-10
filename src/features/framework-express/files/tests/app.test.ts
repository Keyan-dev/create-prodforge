import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('app', () => {
  it('returns a JSON 404 with the request id', async () => {
    const response = await request(createApp()).get('/nope');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatchObject({ message: 'Cannot GET /nope' });
    expect(response.body.error.requestId).toBe(response.headers['x-request-id']);
  });

  it('reuses an incoming X-Request-Id', async () => {
    const response = await request(createApp()).get('/health').set('x-request-id', 'abc-123');

    expect(response.headers['x-request-id']).toBe('abc-123');
  });

  it('rejects malformed JSON with a 400', async () => {
    const response = await request(createApp())
      .post('/anything')
      .set('content-type', 'application/json')
      .send('{"oops"');

    expect(response.status).toBe(400);
  });

  it('sets security headers', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
