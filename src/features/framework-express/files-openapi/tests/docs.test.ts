import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('API docs', () => {
  it('GET /openapi.json serves the OpenAPI document', async () => {
    const response = await request(createApp()).get('/openapi.json');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ openapi: '3.1.0', paths: { '/health': {} } });
  });

  it('GET /docs serves the Scalar page', async () => {
    const response = await request(createApp()).get('/docs');

    expect(response.status).toBe(200);
    expect(response.type).toBe('text/html');
    expect(response.headers['content-security-policy']).toContain('cdn.jsdelivr.net');
  });
});
