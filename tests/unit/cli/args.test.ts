import { parseArgs } from 'citty';
import { describe, expect, it } from 'vitest';
import { args, argsToConfig } from '../../../src/cli/args';
import { unavailable } from '../../../src/cli/availability';
import { parseConfig } from '../../../src/core/config';

const parse = (argv: string[]) => argsToConfig(parseArgs(argv, args));

describe('argsToConfig', () => {
  it('leaves unset flags out so config defaults apply', () => {
    expect(parse([])).toEqual({});
    expect(parse(['my-api', '--yes'])).toEqual({ name: 'my-api' });
  });

  it('maps flags onto config fields', () => {
    expect(
      parse([
        'my-api',
        '--pm',
        'npm',
        '--db',
        'none',
        '--no-install',
        '--no-git',
        '--no-git-hooks',
      ]),
    ).toEqual({
      name: 'my-api',
      packageManager: 'npm',
      db: 'none',
      install: false,
      git: false,
      gitHooks: false,
    });
  });

  it('rejects values the config schema does not allow', () => {
    expect(() => parse(['--framework', 'koa'])).toThrow(/Expected one of/);
  });
});

describe('unavailable', () => {
  it('lists add-ons it skips', () => {
    expect(unavailable(parseConfig({ name: 'x', auth: 'jwt', db: 'none' })).skipped).toContain(
      'auth (it needs a database)',
    );
    expect(unavailable(parseConfig({ name: 'x', db: 'none', example: true })).skipped).toContain(
      'example module (it needs a database)',
    );
  });

  it('reports nothing for a config the current features fully cover', () => {
    for (const framework of ['express', 'fastify', 'hono'] as const) {
      const cfg = parseConfig({ name: 'x', framework, lint: 'biome' });
      expect(unavailable(cfg)).toEqual({ blocking: [], skipped: [] });
    }
  });
});
