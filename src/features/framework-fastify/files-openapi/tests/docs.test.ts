import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('API docs', () => {
  it('GET /openapi.json serves the OpenAPI document', async () => {
    const response = await createApp().inject('/openapi.json');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ openapi: '3.1.0', paths: { '/health': {} } });
  });

  it('GET /docs/ serves the Scalar page', async () => {
    const response = await createApp().inject('/docs/');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.headers['content-security-policy']).toContain("'unsafe-inline'");
  });
});
