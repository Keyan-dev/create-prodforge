import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { x } from 'tinyexec';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { versions } from '../../src/core/versions.js';

/**
 * PLAN.md done-when checks, once per framework × database × linter case (plus optional extra
 * flags): the generated project passes lint, format, typecheck, test and build; its git hooks
 * format staged files and reject a non-conventional commit message; dev, start and pm2 serve
 * /health and the API docs; migrations apply against the compose services and the users API
 * works against them; a queued job reaches the worker; `docker compose up` runs the whole stack.
 * Which checks apply is read from the generated project, so presets work too. Runs the *built*
 * CLI (`pnpm build` first) so template shipping is tested too, and installs real dependencies,
 * so it needs network access.
 *
 * PRODFORGE_E2E_FRAMEWORK, PRODFORGE_E2E_DB and PRODFORGE_E2E_LINT pick the cases
 * (comma-separated; default every framework and database, with ESLint). PRODFORGE_E2E_FLAGS adds
 * CLI flags to every case (e.g. "--cache bullmq --otel"). CI runs one case per job.
 * PRODFORGE_E2E_SKIP_DOCKER=1 skips everything that needs a Docker daemon, which for projects
 * with a database or Redis includes running the app.
 */
const cli = resolve(import.meta.dirname, '../../dist/index.js');
const FRAMEWORKS = ['express', 'fastify', 'hono'] as const;
const DBS = ['prisma', 'drizzle', 'mongoose', 'none'] as const;
const LINTERS = ['eslint', 'biome'] as const;

function pick<T extends string>(name: string, all: readonly T[], fallback: readonly T[]): T[] {
  const chosen = process.env[name]?.split(',') ?? fallback;
  for (const value of chosen) {
    if (!(all as readonly string[]).includes(value)) throw new Error(`${name}: unknown "${value}"`);
  }
  return chosen as T[];
}

const extraFlags = process.env.PRODFORGE_E2E_FLAGS?.split(' ').filter(Boolean) ?? [];
const cases = pick('PRODFORGE_E2E_FRAMEWORK', FRAMEWORKS, FRAMEWORKS).flatMap((framework) =>
  pick('PRODFORGE_E2E_DB', DBS, DBS).flatMap((db) =>
    pick('PRODFORGE_E2E_LINT', LINTERS, ['eslint']).map((lint) => ({
      framework,
      db,
      lint,
      flags: ['--framework', framework, '--db', db, '--lint', lint, ...extraFlags],
    })),
  ),
);
const skipDocker = Boolean(process.env.PRODFORGE_E2E_SKIP_DOCKER);

/** Compose services the app needs but doesn't build itself (databases, Redis, …). */
const APP_SERVICES = new Set(['app', 'migrate', 'worker']);

async function sh(command: string, args: string[], cwd: string, env: Record<string, string> = {}) {
  const result = await x(command, args, {
    nodeOptions: { cwd, env: { ...process.env, CI: '1', ...env } },
  });
  expect(result.exitCode, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`).toBe(0);
  return result.stdout;
}

/** Poll `check` until it stops throwing, or fail after 30 s with its last error. */
async function eventually(what: string, check: () => Promise<void>) {
  const deadline = Date.now() + 30_000;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      await check();
      return;
    } catch (error) {
      last = error;
      await new Promise((done) => setTimeout(done, 250));
    }
  }
  throw new Error(`${what}: ${last instanceof Error ? last.message : String(last)}`);
}

/** Poll /health until it answers `{ status: 'ok' }`. */
async function waitForHealth(port: number, what: string) {
  await eventually(`${what} never answered on port ${port}`, async () => {
    const response = await fetch(`http://localhost:${port}/health`);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
}

async function json(
  port: number,
  path: string,
  init?: { method?: string; body?: unknown; headers?: Record<string, string> },
) {
  // Content-Type only with a body: Fastify rejects an empty body declared as JSON.
  const response = await fetch(`http://localhost:${port}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      ...(init?.body !== undefined && { 'content-type': 'application/json' }),
      ...init?.headers,
    },
    ...(init?.body !== undefined && { body: JSON.stringify(init.body) }),
  });
  const text = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : undefined,
  };
}

/** What the generated project contains, read from its files after generation. */
interface Project {
  dir: string;
  /** Compose services to start before running the app on the host. */
  services: string[];
  migrations: boolean;
  usersApi: boolean;
  docs: boolean;
  auth: 'jwt' | 'better-auth' | undefined;
  worker: boolean;
  hooks: boolean;
  docker: boolean;
  pm2: boolean;
}

async function inspect(dir: string): Promise<Project> {
  const has = (path: string) => existsSync(join(dir, path));
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const compose = has('compose.yaml')
    ? (parse(await readFile(join(dir, 'compose.yaml'), 'utf8')) as {
        services: Record<string, unknown>;
      })
    : { services: {} };
  return {
    dir,
    services: Object.keys(compose.services).filter((name) => !APP_SERVICES.has(name)),
    migrations: 'db:deploy' in pkg.scripts,
    usersApi: has('src/modules/users'),
    docs: has('src/openapi'),
    auth: has('src/lib/jwt.ts') ? 'jwt' : has('src/lib/auth.ts') ? 'better-auth' : undefined,
    worker: has('src/worker.ts'),
    hooks: has('.husky'),
    docker: has('Dockerfile'),
    pm2: has('ecosystem.config.cjs'),
  };
}

/** Readiness, then create → duplicate → read → update → delete against the real database. */
async function expectUsersApi(port: number) {
  const email = `ada-${Date.now()}@example.com`;
  const created = await json(port, '/users', { method: 'POST', body: { email, name: 'Ada' } });
  expect(created).toMatchObject({ status: 201, body: { email, name: 'Ada' } });
  const id = created.body.id as string;

  const duplicate = await json(port, '/users', { method: 'POST', body: { email, name: 'Ada' } });
  expect(duplicate.status).toBe(409);
  expect(await json(port, `/users/${id}`)).toMatchObject({ status: 200, body: { id } });
  expect(
    await json(port, `/users/${id}`, { method: 'PATCH', body: { name: 'Ada King' } }),
  ).toMatchObject({ status: 200, body: { name: 'Ada King' } });
  expect((await json(port, `/users/${id}`, { method: 'DELETE' })).status).toBe(204);
  expect((await json(port, `/users/${id}`)).status).toBe(404);
}

/** Register, log in, call a protected route and refresh with the JWT routes. */
async function expectJwtAuth(port: number) {
  const credentials = { email: `grace-${Date.now()}@example.com`, password: 'correct-horse' };
  expect((await json(port, '/auth/register', { method: 'POST', body: credentials })).status).toBe(
    201,
  );
  const duplicate = await json(port, '/auth/register', { method: 'POST', body: credentials });
  expect(duplicate.status).toBe(409);
  const login = await json(port, '/auth/login', { method: 'POST', body: credentials });
  expect(login.status).toBe(200);
  const { accessToken, refreshToken } = login.body as { accessToken: string; refreshToken: string };

  const me = await json(port, '/auth/me', { headers: { authorization: `Bearer ${accessToken}` } });
  expect(me).toMatchObject({ status: 200, body: { email: credentials.email } });
  expect((await json(port, '/auth/me')).status).toBe(401);
  const refreshed = await json(port, '/auth/refresh', { method: 'POST', body: { refreshToken } });
  expect(refreshed.status).toBe(200);
}

/** Sign up and in with Better Auth, then call a protected route with the cookie and the token. */
async function expectBetterAuth(port: number) {
  const credentials = { email: `grace-${Date.now()}@example.com`, password: 'correct-horse' };
  const signUp = await json(port, '/api/auth/sign-up/email', {
    method: 'POST',
    body: { ...credentials, name: 'Grace' },
  });
  expect(signUp.status).toBe(200);
  const signIn = await json(port, '/api/auth/sign-in/email', { method: 'POST', body: credentials });
  expect(signIn.status).toBe(200);
  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  const token = signIn.headers.get('set-auth-token');
  expect(token).toBeTruthy();

  const withCookie = await json(port, '/auth/me', { headers: { cookie } });
  expect(withCookie).toMatchObject({ status: 200, body: { email: credentials.email } });
  const withToken = await json(port, '/auth/me', { headers: { authorization: `Bearer ${token}` } });
  expect(withToken.status).toBe(200);
  expect((await json(port, '/auth/me')).status).toBe(401);
}

/** /openapi.json describes the API (users paths included with the example); /docs serves HTML. */
async function expectApiDocs(port: number, withUsers: boolean) {
  const document = await json(port, '/openapi.json');
  expect(document).toMatchObject({ status: 200, body: { openapi: '3.1.0' } });
  const paths = Object.keys(document.body.paths);
  expect(paths).toEqual(expect.arrayContaining(['/health', '/ready']));
  if (withUsers) expect(paths).toEqual(expect.arrayContaining(['/users', '/users/{id}']));
  const docs = await fetch(`http://localhost:${port}/docs`);
  expect(docs.status).toBe(200);
  expect(docs.headers.get('content-type')).toMatch(/^text\/html/);
}

/** Every check the running app should pass: readiness of each service, docs, users API, auth. */
async function expectRunningApp(port: number, project: Project) {
  const ready = await json(port, '/ready');
  expect(ready.status).toBe(200);
  expect(ready.body.ready).toBe(true);
  for (const status of Object.values(ready.body.checks)) expect(status).toBe('ok');
  if (project.docs) await expectApiDocs(port, project.usersApi);
  if (project.usersApi) await expectUsersApi(port);
  if (project.auth === 'jwt') await expectJwtAuth(port);
  if (project.auth === 'better-auth') await expectBetterAuth(port);
}

describe.each(cases)('create-prodforge my-api --yes $flags', ({ flags }) => {
  const index = cases.findIndex((c) => c.flags === flags);
  const id = flags
    .filter((flag) => !flag.startsWith('--'))
    .join('-')
    .replace(/[^\w-]/g, '');
  const composeArgs = ['compose', '--project-name', `prodforge-e2e-${id}`.slice(0, 60)];
  const port = 3400 + index * 10;
  let root: string;
  let project: Project;
  // Without Docker there are no services, and a project that needs one won't start.
  const canRun = () => !skipDocker || project.services.length === 0;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'prodforge-e2e-'));
    await sh('node', [cli, 'my-api', '--yes', '--pm', 'pnpm', ...flags], root);
    project = await inspect(join(root, 'my-api'));
  });

  afterAll(async () => {
    if (project?.docker && !skipDocker) {
      await x('docker', [...composeArgs, 'down', '--volumes', '--rmi', 'local'], {
        nodeOptions: { cwd: project.dir },
      });
    }
    if (root) await rm(root, { recursive: true, force: true });
  });

  /** Start a long-running script, wait for /health to answer, run `check`, then stop it. */
  async function whileRunning(script: string, scriptPort: number, check?: () => Promise<void>) {
    const child = spawn('pnpm', [script], {
      cwd: project.dir,
      env: { ...process.env, PORT: String(scriptPort) },
      stdio: 'ignore',
      detached: true,
    });
    try {
      await waitForHealth(scriptPort, `pnpm ${script}`);
      await check?.();
    } finally {
      // Kill the whole group: pnpm → tsx watch → node.
      if (child.pid) process.kill(-child.pid, 'SIGTERM');
    }
  }

  it('commits the initial files to git', async () => {
    expect(await sh('git', ['status', '--porcelain'], project.dir)).toBe('');
  });

  it.each(['lint', 'format:check', 'typecheck', 'test', 'build'])(
    'pnpm %s passes',
    async (script) => {
      await sh('pnpm', [script], project.dir);
    },
  );

  it('git hooks format staged files and enforce Conventional Commits', async (ctx) => {
    if (!project.hooks) ctx.skip();
    const { dir } = project;
    await writeFile(join(dir, 'src/answer.ts'), 'export const   answer = 42\n');
    await sh('git', ['add', 'src/answer.ts'], dir);
    const rejected = await x('git', ['commit', '--message', 'add the answer'], {
      nodeOptions: { cwd: dir },
    });
    expect(rejected.exitCode, 'a non-conventional message is rejected').not.toBe(0);
    await sh('git', ['commit', '--message', 'feat: add the answer'], dir);
    expect(await sh('git', ['show', 'HEAD:src/answer.ts'], dir)).toBe(
      'export const answer = 42;\n',
    );
    await sh('git', ['reset', '--hard', 'HEAD~1'], dir);
  });

  it('starts the compose services and applies migrations', { timeout: 300_000 }, async (ctx) => {
    if (skipDocker || project.services.length === 0) ctx.skip();
    // The local setup the README describes: .env from the example, services in compose.
    await copyFile(join(project.dir, '.env.example'), join(project.dir, '.env'));
    await sh(
      'docker',
      [...composeArgs, 'up', '--detach', '--wait', ...project.services],
      project.dir,
    );
    if (project.migrations) await sh('pnpm', ['db:deploy'], project.dir);
  });

  it('pnpm start serves the app from the build', async (ctx) => {
    if (!canRun()) ctx.skip();
    await whileRunning('start', port + 1, () => expectRunningApp(port + 1, project));
  });

  it('pnpm dev serves /health', async (ctx) => {
    if (!canRun()) ctx.skip();
    await whileRunning('dev', port + 2);
  });

  it('the worker runs a queued job', async (ctx) => {
    if (!project.worker || !canRun()) ctx.skip();
    const { dir } = project;
    await writeFile(
      join(dir, 'enqueue.ts'),
      [
        "import { QueueEvents } from 'bullmq';",
        "import { bullConnection } from './src/jobs/connection';",
        "import { closeExampleQueue, enqueueExampleJob } from './src/jobs/example.job';",
        '',
        "const events = new QueueEvents('example', { connection: bullConnection() });",
        'await events.waitUntilReady();',
        "const job = await enqueueExampleJob({ message: 'from e2e' });",
        'console.log(JSON.stringify(await job.waitUntilFinished(events, 20_000)));',
        'await Promise.all([events.close(), closeExampleQueue()]);',
      ].join('\n'),
    );
    const worker = spawn('pnpm', ['start:worker'], { cwd: dir, stdio: 'ignore', detached: true });
    try {
      const output = await sh('pnpm', ['exec', 'tsx', '--env-file=.env', 'enqueue.ts'], dir);
      expect(output).toContain('processedAt');
    } finally {
      if (worker.pid) process.kill(-worker.pid, 'SIGTERM');
      await rm(join(dir, 'enqueue.ts'));
    }
  });

  it('pm2 runs the build in cluster mode', async (ctx) => {
    if (!project.pm2 || !canRun()) ctx.skip();
    const pm2 = ['dlx', `pm2@${versions.pm2}`];
    // A private PM2_HOME keeps the test's daemon away from any real one.
    const env = { PM2_HOME: join(root, '.pm2'), PORT: String(port + 3) };
    try {
      await sh('pnpm', [...pm2, 'start', 'ecosystem.config.cjs'], project.dir, env);
      await waitForHealth(port + 3, 'pm2');
      const list = JSON.parse(await sh('pnpm', [...pm2, 'jlist'], project.dir, env)) as {
        name: string;
        pm2_env: { exec_mode: string; status: string };
      }[];
      const app = list.filter(({ name }) => name === 'my-api');
      expect(app.length).toBeGreaterThan(0);
      for (const { pm2_env } of app) expect(pm2_env.exec_mode).toBe('cluster_mode');
      await eventually('every pm2 process online', async () => {
        const now = JSON.parse(await sh('pnpm', [...pm2, 'jlist'], project.dir, env)) as {
          pm2_env: { status: string };
        }[];
        for (const { pm2_env } of now) expect(pm2_env.status).toBe('online');
      });
    } finally {
      await x('pnpm', [...pm2, 'kill'], {
        nodeOptions: { cwd: project.dir, env: { ...process.env, ...env } },
      });
    }
  });

  it('docker compose up runs the whole stack', { timeout: 600_000 }, async (ctx) => {
    if (skipDocker || !project.docker) ctx.skip();
    const env = { PORT: String(port + 4) };
    await sh('docker', [...composeArgs, 'up', '--build', '--detach', '--wait'], project.dir, env);
    await waitForHealth(port + 4, 'docker compose');
    await expectRunningApp(port + 4, project);
  });
});
