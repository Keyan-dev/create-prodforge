import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { x } from 'tinyexec';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * PLAN.md Phase 2 done-when: `create-prodforge my-api --yes` gives a project where dev, test,
 * lint and build pass. Runs the *built* CLI (`pnpm build` first) so template shipping is tested
 * too, and installs real dependencies, so it needs network access.
 */
const cli = resolve(import.meta.dirname, '../../dist/index.js');

let root: string;
let project: string;

async function sh(command: string, args: string[], cwd = project) {
  const result = await x(command, args, { nodeOptions: { cwd, env: { ...process.env, CI: '1' } } });
  expect(result.exitCode, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`).toBe(0);
  return result.stdout;
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
    throw new Error(`pnpm ${script} never answered on port ${port}`);
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
});
