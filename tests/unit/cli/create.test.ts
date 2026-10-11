import { existsSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { create } from '../../../src/cli/create';

const quiet = { yes: true, install: false, git: false };

async function tempDir() {
  return mkdtemp(join(tmpdir(), 'prodforge-create-'));
}

describe('create', () => {
  it('--dry-run writes nothing', async () => {
    const cwd = await tempDir();
    await create(
      { ...quiet, name: 'dry' },
      { cwd, interactive: false, force: false, dryRun: true },
    );
    expect(existsSync(join(cwd, 'dry'))).toBe(false);
  });

  it('--preset fills in options and flags override it', async () => {
    const cwd = await tempDir();
    await create(
      { ...quiet, name: 'mini', preset: 'minimal', framework: 'hono' },
      { cwd, interactive: false, force: false },
    );
    const pkg = await readFile(join(cwd, 'mini', 'package.json'), 'utf8');
    expect(pkg).toContain('"hono"');
    expect(pkg).not.toMatch(/prisma|husky/);
    expect(existsSync(join(cwd, 'mini', 'Dockerfile'))).toBe(true);
    expect(existsSync(join(cwd, 'mini', 'ecosystem.config.cjs'))).toBe(false);
  });

  it('--preset reads a JSON file relative to the working directory', async () => {
    const cwd = await tempDir();
    await writeFile(join(cwd, 'team.json'), JSON.stringify({ db: 'drizzle', lint: 'biome' }));
    await create(
      { ...quiet, name: 'team', preset: './team.json' },
      { cwd, interactive: false, force: false },
    );
    const pkg = await readFile(join(cwd, 'team', 'package.json'), 'utf8');
    expect(pkg).toMatch(
      /"drizzle-orm"[\s\S]*"@biomejs\/biome"|"@biomejs\/biome"[\s\S]*"drizzle-orm"/,
    );
  });

  it('--latest uses the versions npm reports', async () => {
    const cwd = await tempDir();
    await create(
      { ...quiet, name: 'fresh', db: 'none' },
      { cwd, interactive: false, force: false, latest: true, latestVersion: async () => '99.0.0' },
    );
    const pkg = JSON.parse(await readFile(join(cwd, 'fresh', 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.express).toBe('^99.0.0');
  });
});
