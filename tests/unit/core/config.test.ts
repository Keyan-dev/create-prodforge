import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/core/config';

describe('parseConfig', () => {
  it('fills in the api preset defaults', () => {
    expect(parseConfig({ name: 'my-api' })).toEqual({
      name: 'my-api',
      node: '24',
      packageManager: 'pnpm',
      framework: 'express',
      db: 'prisma',
      example: true,
      cache: 'none',
      auth: 'none',
      lint: 'eslint',
      openapi: true,
      otel: false,
      docker: true,
      pm2: true,
      ci: true,
      gitHooks: true,
      install: true,
      git: true,
    });
  });

  it('turns the example module off when there is no database', () => {
    expect(parseConfig({ name: 'svc', db: 'none' }).example).toBe(false);
  });

  it('keeps an explicit example choice', () => {
    expect(parseConfig({ name: 'svc', db: 'none', example: true }).example).toBe(true);
    expect(parseConfig({ name: 'svc', example: false }).example).toBe(false);
  });

  it.each(['My App', 'UPPER', '.hidden', '_private', ''])('rejects the name %j', (name) => {
    expect(() => parseConfig({ name })).toThrow();
  });

  it.each(['my-api', '@acme/api', 'api.v2'])('accepts the name %j', (name) => {
    expect(parseConfig({ name }).name).toBe(name);
  });

  it('rejects unknown option values', () => {
    expect(() => parseConfig({ name: 'x', framework: 'koa' as never })).toThrow();
  });
});
