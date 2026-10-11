import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/core/config';
import { loadPreset, presets } from '../../../src/core/presets';

describe('presets', () => {
  it('api matches the --yes defaults', () => {
    expect(parseConfig({ name: 'x', ...presets.api })).toEqual(parseConfig({ name: 'x' }));
  });

  it('full turns on every add-on', () => {
    expect(parseConfig({ name: 'x', ...presets.full })).toMatchObject({
      cache: 'bullmq',
      auth: 'better-auth',
      otel: true,
      example: true,
    });
  });

  it('minimal has no database and only Docker', () => {
    expect(parseConfig({ name: 'x', ...presets.minimal })).toMatchObject({
      db: 'none',
      example: false,
      openapi: false,
      docker: true,
      pm2: false,
      ci: false,
      gitHooks: false,
    });
  });

  it('loads a built-in preset by name', async () => {
    expect(await loadPreset('full', '/')).toBe(presets.full);
  });

  it('rejects an unknown name', async () => {
    await expect(loadPreset('huge', '/')).rejects.toThrow(/Unknown preset "huge"/);
  });

  describe('from a JSON file', () => {
    async function file(content: unknown) {
      const dir = await mkdtemp(join(tmpdir(), 'prodforge-preset-'));
      await writeFile(join(dir, 'team.json'), JSON.stringify(content));
      return dir;
    }

    it('reads only the fields it sets, so defaults and prompts fill the rest', async () => {
      const dir = await file({ $schema: 'x', framework: 'hono', db: 'drizzle', otel: true });
      expect(await loadPreset('./team.json', dir)).toEqual({
        framework: 'hono',
        db: 'drizzle',
        otel: true,
      });
    });

    it('rejects unknown keys and bad values', async () => {
      const dir = await file({ framework: 'koa', colour: 'blue' });
      await expect(loadPreset('./team.json', dir)).rejects.toThrow(/framework|colour/);
    });

    it("doesn't take a name, install or git", async () => {
      const dir = await file({ name: 'other' });
      await expect(loadPreset('./team.json', dir)).rejects.toThrow(/name/);
    });

    it('explains a missing file', async () => {
      await expect(loadPreset('./missing.json', tmpdir())).rejects.toThrow(
        /Couldn't read preset \.\/missing\.json/,
      );
    });
  });
});
