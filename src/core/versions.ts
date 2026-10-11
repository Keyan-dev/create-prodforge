/**
 * Every dependency version used in generated projects. This is the only file that may hold a
 * version string for them (CLAUDE.md). Renovate updates these through the custom manager in
 * `renovate.json`, so keep one `'name': 'x.y.z',` entry per line.
 *
 * Values are exact versions; `package-json.ts` writes them as caret ranges.
 */
export const versions = {
  // runtime
  '@fastify/cors': '11.3.1',
  '@fastify/helmet': '13.1.2',
  '@fastify/rate-limit': '11.2.1',
  '@hono/node-server': '2.1.4',
  '@prisma/adapter-pg': '7.10.0',
  '@prisma/client': '7.10.0',
  '@scalar/express-api-reference': '0.10.28',
  '@scalar/fastify-api-reference': '1.73.1',
  '@scalar/hono-api-reference': '0.12.11',
  'cors': '2.8.6',
  'drizzle-orm': '0.45.4',
  'express': '5.3.0',
  'express-rate-limit': '8.7.1',
  'fastify': '5.12.5',
  'helmet': '8.3.0',
  'hono': '4.13.13',
  'hono-rate-limiter': '0.5.4',
  'mongoose': '9.11.1',
  'pg': '8.23.1',
  'pino': '10.4.0',
  'pino-http': '11.0.0',
  'zod': '4.6.5',
  'zod-openapi': '6.0.2',
  // build and types
  '@types/cors': '2.8.19',
  '@types/express': '5.0.6',
  '@types/node': '24.19.2',
  '@types/pg': '8.23.1',
  'tsdown': '0.23.1',
  'tsx': '4.23.15',
  'typescript': '6.0.3',
  // database tooling
  'drizzle-kit': '0.31.11',
  'prisma': '7.10.0',
  // dev logging
  'pino-pretty': '13.2.0',
  // testing
  '@types/supertest': '7.2.1',
  'supertest': '7.3.1',
  '@vitest/coverage-v8': '5.0.3',
  'vitest': '5.0.3',
  // loaded by the generated /docs page from a CDN, not installed
  '@scalar/api-reference': '1.73.1',
  // lint and format
  '@biomejs/biome': '2.5.15',
  '@eslint/js': '10.0.1',
  'eslint': '10.12.0',
  'eslint-config-prettier': '10.1.8',
  'globals': '17.13.0',
  'prettier': '3.9.10',
  'typescript-eslint': '8.71.1',
  // git hooks
  '@commitlint/cli': '21.2.3',
  '@commitlint/config-conventional': '21.2.3',
  'husky': '9.1.7',
  'lint-staged': '17.6.0',
  // deploy tooling (installed on the host or in the image, not in package.json)
  'pm2': '7.0.4',
  'pnpm': '10.28.0',
} as const;

/**
 * Docker images for compose services, as `image:tag`. Renovate updates them through a second
 * custom manager; keys stay unquoted so the npm manager above doesn't pick these up.
 */
export const images = {
  mongo: 'mongo:8',
  postgres: 'postgres:18-alpine',
} as const;

/**
 * GitHub Actions used by generated CI workflows, as `owner/repo@major`. Renovate updates them
 * through a third custom manager; keys stay unquoted like `images`.
 */
export const actions = {
  checkout: 'actions/checkout@v7',
  setupNode: 'actions/setup-node@v7',
  pnpmSetup: 'pnpm/action-setup@v6',
  setupBun: 'oven-sh/setup-bun@v2',
  setupBuildx: 'docker/setup-buildx-action@v4',
  buildPush: 'docker/build-push-action@v7',
} as const;

export type PackageName = keyof typeof versions;

/** Pick pinned versions for the given packages, ready for `pkg.addDeps()` / `addDevDeps()`. */
export function pick<const K extends PackageName>(...names: K[]): Record<K, string> {
  const picked = {} as Record<K, string>;
  for (const name of names) picked[name] = versions[name];
  return picked;
}
