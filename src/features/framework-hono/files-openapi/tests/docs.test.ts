import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('API docs', () => {
  it('GET /openapi.json serves the OpenAPI document', async () => {
    const response = await createApp().request('/openapi.json');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ openapi: '3.1.0', paths: { '/health': {} } });
  });

  it('GET /docs serves the Scalar page', async () => {
    const response = await createApp().request('/docs');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/html/);
    expect(response.headers.get('content-security-policy')).toContain('cdn.jsdelivr.net');
  });
});
