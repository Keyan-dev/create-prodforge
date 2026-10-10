import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { x } from 'tinyexec';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { versions } from '../../src/core/versions.js';

/**
 * PLAN.md Phase 2 and 3 done-when: `create-prodforge my-api --yes` gives a project where dev,
 * test, lint and build pass, `docker compose up` serves /health and pm2 runs in cluster mode. Runs the *built* CLI (`pnpm build` first) so template shipping is tested
 * too, and installs real dependencies, so it needs network access.
 */
const cli = resolve(import.meta.dirname, '../../dist/index.js');

let root: string;
let project: string;

async function sh(
  command: string,
  args: string[],
  cwd = project,
  env: Record<string, string> = {},
) {
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

/** Start a long-running script, wait for /health to answer, then stop it. */
async function expectHealthy(script: string, port: number) {
  const child = spawn('pnpm', [script], {
    cwd: project,
    env: { ...process.env, PORT: String(port) },
    stdio: 'ignore',
    detached: true,
  });
  try {
    await waitForHealth(port, `pnpm ${script}`);
  } finally {
    // Kill the whole group: pnpm → tsx watch → node.
    if (child.pid) process.kill(-child.pid, 'SIGTERM');
  }
}

describe('create-prodforge my-api --yes', () => {
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'prodforge-e2e-'));
    project = join(root, 'my-api');
    await sh('node', [cli, 'my-api', '--yes', '--pm', 'pnpm'], root);
  });

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it('commits the initial files to git', async () => {
    expect(await sh('git', ['status', '--porcelain'])).toBe('');
  });

  it.each(['lint', 'format:check', 'typecheck', 'test', 'build'])(
    'pnpm %s passes',
    async (script) => {
      await sh('pnpm', [script]);
    },
  );

  it('pnpm start serves /health from the build', async () => {
    await expectHealthy('start', 3401);
  });

  it('pnpm dev serves /health', async () => {
    await expectHealthy('dev', 3402);
  });

  it('pm2 runs the build in cluster mode', async () => {
    const pm2 = ['dlx', `pm2@${versions.pm2}`];
    // A private PM2_HOME keeps the test's daemon away from any real one.
    const env = { PM2_HOME: join(root, '.pm2'), PORT: '3403' };
    try {
      await sh('pnpm', [...pm2, 'start', 'ecosystem.config.cjs'], project, env);
      await waitForHealth(3403, 'pm2');
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

  // Needs a Docker daemon; set PRODFORGE_E2E_SKIP_DOCKER=1 where there is none.
  it.skipIf(process.env.PRODFORGE_E2E_SKIP_DOCKER)(
    'docker compose up serves /health',
    async () => {
      const compose = ['compose', '--project-name', 'prodforge-e2e'];
      const env = { PORT: '3404' };
      try {
        await sh('docker', [...compose, 'up', '--build', '--detach', '--wait'], project, env);
        await waitForHealth(3404, 'docker compose');
      } finally {
        await x('docker', [...compose, 'down', '--rmi', 'local'], {
          nodeOptions: { cwd: project, env: { ...process.env, ...env } },
        });
      }
    },
    600_000,
  );
});
