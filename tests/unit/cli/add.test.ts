import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { add, withAddons } from '../../../src/cli/add';
import { create } from '../../../src/cli/create';
import { parseConfig } from '../../../src/core/config';

async function project(flags: Record<string, unknown> = {}) {
  const cwd = await mkdtemp(join(tmpdir(), 'prodforge-add-'));
  await create(
    { yes: true, install: false, git: false, name: 'app', ...flags },
    { cwd, interactive: false, force: false, version: '1.0.0' },
  );
  return join(cwd, 'app');
}

const options = (cwd: string) => ({ cwd, install: false, dryRun: false, version: '1.0.0' });
const read = (dir: string, path: string) => readFile(join(dir, path), 'utf8');

describe('withAddons', () => {
  const cfg = parseConfig({ name: 'x' });

  it('turns on what was asked', () => {
    expect(withAddons(cfg, ['bullmq', 'otel'])).toMatchObject({ cache: 'bullmq', otel: true });
  });

  it("doesn't downgrade bullmq to plain redis", () => {
    expect(withAddons({ ...cfg, cache: 'bullmq' }, ['redis']).cache).toBe('bullmq');
  });

  it("won't switch auth or add it without a database", () => {
    expect(() => withAddons({ ...cfg, auth: 'jwt' }, ['better-auth'])).toThrow(/switching/);
    expect(() => withAddons({ ...cfg, db: 'none', example: false }, ['jwt'])).toThrow(/database/);
  });
});

describe('add', () => {
  it('records the options in .prodforge.json when creating a project', async () => {
    const dir = await project();
    expect(JSON.parse(await read(dir, '.prodforge.json'))).toMatchObject({
      version: '1.0.0',
      config: { name: 'app', framework: 'express', db: 'prisma', cache: 'none' },
    });
  });

  it('creates new files, merges your edits and updates the manifest', async () => {
    const dir = await project();
    const app = await read(dir, 'src/app.ts');
    const edited = app.replace(
      "app.use('/users', usersRouter);",
      "app.use('/users', usersRouter);\n  app.get('/ping', (_req, res) => res.json({ pong: true }));",
    );
    expect(edited).not.toBe(app);
    await writeFile(join(dir, 'src/app.ts'), edited);
    await writeFile(join(dir, '.env'), 'PORT=4000\n');

    await add(['jwt', 'redis'], options(dir));

    const merged = await read(dir, 'src/app.ts');
    expect(merged).toContain("app.get('/ping'");
    expect(merged).toContain("app.use('/auth', authRouter);");
    expect(existsSync(join(dir, 'src/lib/jwt.ts'))).toBe(true);
    expect(existsSync(join(dir, 'src/lib/redis.ts'))).toBe(true);
    expect(JSON.parse(await read(dir, 'package.json')).dependencies).toHaveProperty('ioredis');
    const env = await read(dir, '.env');
    expect(env).toMatch(/^PORT=4000\n/);
    expect(env).toContain('JWT_SECRET=');
    expect(env).toContain('REDIS_URL=');
    expect(JSON.parse(await read(dir, '.prodforge.json')).config).toMatchObject({
      auth: 'jwt',
      cache: 'redis',
    });
  });

  it('leaves conflict markers where both sides changed the same lines', async () => {
    const dir = await project({ db: 'none' });
    const tsdown = await read(dir, 'tsdown.config.ts');
    await writeFile(
      join(dir, 'tsdown.config.ts'),
      tsdown.replace("'src/server.ts',", "'src/server.ts',\n    'src/cli.ts',"),
    );
    await add(['otel'], options(dir));
    const merged = await read(dir, 'tsdown.config.ts');
    expect(merged).toContain('<<<<<<< yours');
    expect(merged).toContain('>>>>>>> create-prodforge');
  });

  it('--dry-run writes nothing', async () => {
    const dir = await project({ db: 'none' });
    const before = await read(dir, 'package.json');
    await add(['otel'], { ...options(dir), dryRun: true });
    expect(await read(dir, 'package.json')).toBe(before);
    expect(existsSync(join(dir, 'src/instrumentation.ts'))).toBe(false);
  });

  it('needs a manifest and known add-ons', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'prodforge-add-'));
    await expect(add(['otel'], options(empty))).rejects.toThrow(/No \.prodforge\.json/);
    await expect(add(['kafka'], options(empty))).rejects.toThrow(/Unknown add-on: kafka/);
  });
});
