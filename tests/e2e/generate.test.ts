import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { x } from 'tinyexec';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { versions } from '../../src/core/versions.js';

/**
 * PLAN.md done-when checks for phases 2 to 4, once per database option: the generated project
 * passes lint, format, typecheck, test and build; dev, start and pm2 (cluster mode) serve
 * /health; migrations apply against the compose database and the users API works against it;
 * `docker compose up` runs the whole stack. Runs the *built* CLI (`pnpm build` first) so
 * template shipping is tested too, and installs real dependencies, so it needs network access.
 *
 * PRODFORGE_E2E_DB picks databases (comma-separated, default all; CI runs one per job).
 * PRODFORGE_E2E_SKIP_DOCKER=1 skips everything that needs a Docker daemon, which for the
 * database options includes running the app.
 */
const cli = resolve(import.meta.dirname, '../../dist/index.js');
const ALL = ['prisma', 'drizzle', 'mongoose', 'none'] as const;
type Db = (typeof ALL)[number];

const selected = (process.env.PRODFORGE_E2E_DB?.split(',') ?? ALL) as Db[];
const skipDocker = Boolean(process.env.PRODFORGE_E2E_SKIP_DOCKER);

/** Compose service each database option starts, and whether it has migrations. */
const DATABASES: Record<Exclude<Db, 'none'>, { service: string; migrations: boolean }> = {
  prisma: { service: 'postgres', migrations: true },
  drizzle: { service: 'postgres', migrations: true },
  mongoose: { service: 'mongo', migrations: false },
};

async function sh(command: string, args: string[], cwd: string, env: Record<string, string> = {}) {
  const result = await x(command, args, {
    nodeOptions: { cwd, env: { ...process.env, CI: '1', ...env } },
  });
  expect(result.exitCode, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`).toBe(0);
  return result.stdout;
}

/** Poll /health until it answers `{ status: 'ok' }`. */
async function waitForHealth(port: number, what: string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      expect(await response.json()).toEqual({ status: 'ok' });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AssertionError') throw error;
      await new Promise((done) => setTimeout(done, 250));
    }
  }
  throw new Error(`${what} never answered on port ${port}`);
}

async function json(port: number, path: string, init?: { method: string; body?: unknown }) {
  const response = await fetch(`http://localhost:${port}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'content-type': 'application/json' },
    ...(init?.body !== undefined && { body: JSON.stringify(init.body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

/** Readiness, then create → duplicate → read → update → delete against the real database. */
async function expectUsersApi(port: number) {
  expect(await json(port, '/ready')).toEqual({
    status: 200,
    body: { ready: true, checks: { database: 'ok' } },
  });
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

describe.each(selected)('create-prodforge my-api --yes --db %s', (db) => {
  const database = db === 'none' ? undefined : DATABASES[db];
  // Without Docker there is no database, and a project with one won't start without it.
  const canRun = !skipDocker || !database;
  const compose = ['compose', '--project-name', `prodforge-e2e-${db}`];
  const port = 3400 + ALL.indexOf(db) * 10;
  let root: string;
  let project: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), `prodforge-e2e-${db}-`));
    project = join(root, 'my-api');
    await sh('node', [cli, 'my-api', '--yes', '--pm', 'pnpm', '--db', db], root);
  });

  afterAll(async () => {
    if (project && !skipDocker) {
      await x('docker', [...compose, 'down', '--volumes', '--rmi', 'local'], {
        nodeOptions: { cwd: project },
      });
    }
    if (root) await rm(root, { recursive: true, force: true });
  });

  /** Start a long-running script, wait for /health to answer, run `check`, then stop it. */
  async function whileRunning(script: string, scriptPort: number, check?: () => Promise<void>) {
    const child = spawn('pnpm', [script], {
      cwd: project,
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
    expect(await sh('git', ['status', '--porcelain'], project)).toBe('');
  });

  it.each(['lint', 'format:check', 'typecheck', 'test', 'build'])(
    'pnpm %s passes',
    async (script) => {
      await sh('pnpm', [script], project);
    },
  );

  if (database) {
    it.skipIf(skipDocker)(
      'starts the compose database and applies migrations',
      async () => {
        // The local setup the README describes: .env from the example, database in compose.
        await copyFile(join(project, '.env.example'), join(project, '.env'));
        await sh('docker', [...compose, 'up', '--detach', '--wait', database.service], project);
        if (database.migrations) await sh('pnpm', ['db:deploy'], project);
      },
      300_000,
    );
  }

  it.runIf(canRun)('pnpm start serves /health from the build', async () => {
    await whileRunning('start', port + 1, database && (() => expectUsersApi(port + 1)));
  });

  it.runIf(canRun)('pnpm dev serves /health', async () => {
    await whileRunning('dev', port + 2);
  });

  it.runIf(canRun)('pm2 runs the build in cluster mode', async () => {
    const pm2 = ['dlx', `pm2@${versions.pm2}`];
    // A private PM2_HOME keeps the test's daemon away from any real one.
    const env = { PM2_HOME: join(root, '.pm2'), PORT: String(port + 3) };
    try {
      await sh('pnpm', [...pm2, 'start', 'ecosystem.config.cjs'], project, env);
      await waitForHealth(port + 3, 'pm2');
      const list = JSON.parse(await sh('pnpm', [...pm2, 'jlist'], project, env)) as {
        pm2_env: { exec_mode: string; status: string };
      }[];
      expect(list.length).toBeGreaterThan(0);
      for (const { pm2_env } of list) {
        expect(pm2_env).toMatchObject({ exec_mode: 'cluster_mode', status: 'online' });
      }
    } finally {
      await x('pnpm', [...pm2, 'kill'], {
        nodeOptions: { cwd: project, env: { ...process.env, ...env } },
      });
    }
  });

  it.skipIf(skipDocker)(
    'docker compose up runs the whole stack',
    async () => {
      const env = { PORT: String(port + 4) };
      await sh('docker', [...compose, 'up', '--build', '--detach', '--wait'], project, env);
      await waitForHealth(port + 4, 'docker compose');
      if (database) await expectUsersApi(port + 4);
    },
    600_000,
  );
});
