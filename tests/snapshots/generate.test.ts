import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseConfig, type ProjectConfigInput } from '../../src/core/config';
import { generate } from '../../src/core/pipeline';
import { presets } from '../../src/core/presets';
import { features } from '../../src/features';

async function snapshot(input: ProjectConfigInput) {
  const { files, features: ran } = await generate(parseConfig(input), features);
  return {
    features: ran,
    files: Object.fromEntries(files.entries().map(([path, file]) => [path, file.content])),
  };
}

// One case per option that changes output. Review snapshot diffs like code.
describe('generated project', () => {
  it('--yes defaults (express, vitest, eslint, pnpm, node 24)', async () => {
    expect(await snapshot({ name: 'my-api' })).toMatchSnapshot();
  });

  it('npm on node 22', async () => {
    const result = await snapshot({ name: 'my-api', packageManager: 'npm', node: '22' });
    expect(result.files['package.json']).toMatchSnapshot();
    expect(result.files['README.md']).toMatchSnapshot();
    expect(result.files['.nvmrc']).toBe('22\n');
    expect(result.files['tsdown.config.ts']).toContain("target: 'node22'");
  });

  it('without docker and pm2', async () => {
    const { files } = await snapshot({ name: 'my-api', docker: false, pm2: false });
    expect(Object.keys(files)).not.toContain('Dockerfile');
    expect(Object.keys(files)).not.toContain('ecosystem.config.cjs');
    expect(files['README.md']).not.toMatch(/## Docker|## PM2/);
  });

  it('npm Dockerfile', async () => {
    const { files } = await snapshot({ name: 'my-api', packageManager: 'npm' });
    expect(files['Dockerfile']).toMatchSnapshot();
  });

  it('yarn gets no Dockerfile yet', async () => {
    const { files } = await snapshot({ name: 'my-api', packageManager: 'yarn' });
    expect(Object.keys(files)).not.toContain('Dockerfile');
    expect(files['package.json']).not.toContain('packageManager');
  });

  // The files a database choice changes, so each snapshot stays reviewable.
  const DB_FILES =
    /^(package\.json|compose\.yaml|README\.md|\.env\.example|src\/(server|app)\.ts|src\/config\/env\.ts|src\/db\/|src\/modules\/users\/|drizzle|prisma|tests\/users)/;
  const dbFiles = (files: Record<string, string>) =>
    Object.fromEntries(Object.entries(files).filter(([path]) => DB_FILES.test(path)));

  it.each(['drizzle', 'mongoose'] as const)('--db %s', async (db) => {
    const { files, features: ran } = await snapshot({ name: 'my-api', db });
    expect(ran).toContain(`db-${db}`);
    expect(dbFiles(files)).toMatchSnapshot();
  });

  it('--db none has no database or users module', async () => {
    const { files } = await snapshot({ name: 'my-api', db: 'none' });
    expect(Object.keys(files).filter((path) => /db|users|prisma/.test(path))).toEqual([]);
    expect(files['compose.yaml']).toMatchSnapshot();
    expect(files['src/server.ts']).toMatchSnapshot();
  });

  it('prisma without the example module', async () => {
    const { files } = await snapshot({ name: 'my-api', example: false });
    expect(files['prisma/schema.prisma']).not.toContain('model User');
    expect(Object.keys(files).filter((path) => /users|migrations\/\d/.test(path))).toEqual([]);
  });

  it('drizzle without the example module', async () => {
    const { files } = await snapshot({ name: 'my-api', db: 'drizzle', example: false });
    expect(files['src/db/schema.ts']).toMatchSnapshot();
    expect(Object.keys(files).filter((path) => /users|drizzle\//.test(path))).toEqual([
      'drizzle/meta/_journal.json',
    ]);
    expect(files['drizzle/meta/_journal.json']).toContain('"entries": []');
  });

  // A framework owns the HTTP layer: app, server, middleware, routes and their tests.
  const FRAMEWORK_FILES = /^(package\.json|\.env\.example|src\/(?!db\/)|tests\/(?!support\/))/;

  it.each(['fastify', 'hono'] as const)('--framework %s', async (framework) => {
    const { files, features: ran } = await snapshot({ name: 'my-api', framework });
    expect(ran).toContain(`framework-${framework}`);
    expect(ran).not.toContain('framework-express');
    expect(
      Object.fromEntries(Object.entries(files).filter(([path]) => FRAMEWORK_FILES.test(path))),
    ).toMatchSnapshot();
  });

  it('--lint biome', async () => {
    const { files, features: ran } = await snapshot({
      name: 'my-api',
      lint: 'biome',
      db: 'drizzle',
    });
    expect(ran).toContain('lint-biome');
    expect(ran).not.toContain('lint-eslint');
    expect(Object.keys(files).filter((path) => /eslint|prettier/.test(path))).toEqual([]);
    expect(files['biome.jsonc']).toMatchSnapshot();
    expect(JSON.parse(files['package.json'] ?? '{}')).toMatchObject({
      scripts: { lint: 'biome lint', format: 'biome format --write' },
    });
    expect(files['README.md']).toContain('lint with Biome');
  });

  it('git hooks follow the package manager and linter', async () => {
    const { files } = await snapshot({ name: 'my-api', packageManager: 'npm', lint: 'biome' });
    expect(files['.husky/pre-commit']).toBe('npx --no -- lint-staged\n');
    expect(files['.husky/commit-msg']).toBe('npx --no -- commitlint --edit "$1"\n');
    expect(JSON.parse(files['package.json'] ?? '{}')['lint-staged']).toEqual({
      '*': 'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
    });
  });

  it.each(['pnpm', 'npm', 'bun'] as const)('CI workflow with %s', async (packageManager) => {
    const { files } = await snapshot({ name: 'my-api', packageManager });
    const workflow = files['.github/workflows/ci.yml'];
    expect(parse(workflow ?? '')).toHaveProperty('jobs.check.steps');
    expect(workflow).toMatchSnapshot();
  });

  it('without CI', async () => {
    const { files } = await snapshot({ name: 'my-api', ci: false });
    expect(Object.keys(files).filter((path) => path.startsWith('.github/'))).toEqual([]);
  });

  it('OpenAPI document with the users paths', async () => {
    const { files, features: ran } = await snapshot({ name: 'my-api' });
    expect(ran).toContain('openapi');
    expect(files['src/openapi/document.ts']).toMatchSnapshot();
    expect(files['src/openapi/docs-page.ts']).toMatch(/@scalar\/api-reference@\d+\.\d+\.\d+'/);
    expect(files['src/app.ts']).toContain('app.use(docsRouter);');
  });

  it.each(['express', 'fastify', 'hono'] as const)('without OpenAPI (%s)', async (framework) => {
    const { files } = await snapshot({ name: 'my-api', framework, openapi: false });
    expect(Object.keys(files).filter((path) => /openapi|docs/.test(path))).toEqual([]);
    expect(files['package.json']).not.toMatch(/zod-openapi|@scalar/);
    expect(files['src/app.ts']).not.toMatch(/docs/i);
  });

  it('--cache bullmq adds Redis, a worker and its compose service', async () => {
    const { files, features: ran } = await snapshot({ name: 'my-api', cache: 'bullmq' });
    expect(ran).toEqual(expect.arrayContaining(['cache-redis', 'queue-bullmq']));
    expect(files['src/lib/redis.ts']).toBeDefined();
    expect(files['src/worker.ts']).toMatchSnapshot();
    expect(files['src/server.ts']).toMatchSnapshot();
    expect(files['compose.yaml']).toMatchSnapshot();
    expect(files['ecosystem.config.cjs']).toMatchSnapshot();
    expect(files['tsdown.config.ts']).toContain("'src/worker.ts',");
  });

  it('--cache redis has no worker', async () => {
    const { files, features: ran } = await snapshot({ name: 'my-api', cache: 'redis' });
    expect(ran).toContain('cache-redis');
    expect(ran).not.toContain('queue-bullmq');
    expect(files['src/worker.ts']).toBeUndefined();
    expect(files['.env.example']).toContain('REDIS_URL=redis://localhost:6379');
  });

  it('--otel loads the instrumentation in every start script', async () => {
    const { files } = await snapshot({ name: 'my-api', otel: true, cache: 'bullmq' });
    const { scripts } = JSON.parse(files['package.json'] ?? '{}') as {
      scripts: Record<string, string>;
    };
    for (const name of ['dev', 'start', 'dev:worker', 'start:worker']) {
      expect(scripts[name], name).toMatch(/--import \.\/(src|dist)\/instrumentation\.(ts|js)/);
    }
    expect(files['Dockerfile']).toContain('ENV NODE_OPTIONS="--import ./dist/instrumentation.js"');
    expect(files['ecosystem.config.cjs']).toContain(
      "NODE_OPTIONS: '--import ./dist/instrumentation.js',",
    );
    expect(files['src/instrumentation.ts']).toMatchSnapshot();
  });

  // Auth files come from three places: the auth feature (service, tokens), the database (storage)
  // and the framework (routes, tests). Snapshot what each adds.
  const AUTH_FILES =
    /auth|password|jwt|schema\.(prisma|ts)$|drizzle\/|migrations\/|src\/app\.ts|\.env/;

  it.each([
    ['jwt', 'prisma', 'express'],
    ['jwt', 'drizzle', 'fastify'],
    ['jwt', 'mongoose', 'hono'],
    ['better-auth', 'prisma', 'fastify'],
    ['better-auth', 'drizzle', 'hono'],
    ['better-auth', 'mongoose', 'express'],
  ] as const)('--auth %s with %s and %s', async (auth, db, framework) => {
    const { files, features: ran } = await snapshot({ name: 'my-api', auth, db, framework });
    expect(ran).toContain(auth === 'jwt' ? 'auth-jwt' : 'auth-better-auth');
    expect(
      Object.fromEntries(Object.entries(files).filter(([path]) => AUTH_FILES.test(path))),
    ).toMatchSnapshot();
    expect(files['package.json']).toContain(auth === 'jwt' ? '"jose"' : '"better-auth"');
  });

  it('--auth jwt documents its routes in OpenAPI', async () => {
    const { files } = await snapshot({ name: 'my-api', auth: 'jwt' });
    expect(files['src/openapi/document.ts']).toMatchSnapshot();
  });

  it('--auth needs a database', async () => {
    const { features: ran } = await snapshot({ name: 'my-api', auth: 'jwt', db: 'none' });
    expect(ran).not.toContain('auth-jwt');
  });

  it.each(['minimal', 'full'] as const)('--preset %s file tree', async (preset) => {
    const { files, features: ran } = await snapshot({ name: 'my-api', ...presets[preset] });
    expect({ features: ran, files: Object.keys(files).sort() }).toMatchSnapshot();
    expect(files['package.json']).toMatchSnapshot();
  });

  it('without git hooks', async () => {
    const { files } = await snapshot({ name: 'my-api', gitHooks: false });
    expect(Object.keys(files).filter((path) => /husky|commitlint/.test(path))).toEqual([]);
    expect(files['package.json']).not.toMatch(/husky|lint-staged|"prepare"/);
  });

  it.each(['prisma', 'drizzle', 'mongoose', 'none'] as const)(
    'leaves no slot markers behind (%s)',
    async (db) => {
      for (const framework of ['express', 'fastify', 'hono'] as const) {
        const { files } = await snapshot({ name: 'my-api', db, framework });
        for (const [path, content] of Object.entries(files)) {
          expect(content, `${framework}: ${path}`).not.toMatch(/@slot:/);
        }
      }
    },
  );
});
