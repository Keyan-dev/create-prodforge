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
  it('blocks options without a feature and lists skipped add-ons', () => {
    expect(unavailable(parseConfig({ name: 'x', framework: 'hono' })).blocking).toEqual([
      'framework "hono"',
    ]);
    expect(unavailable(parseConfig({ name: 'x' })).skipped).toContain('database (prisma)');
  });

  it('reports nothing for a config the current features fully cover', () => {
    const cfg = parseConfig({
      name: 'x',
      db: 'none',
      openapi: false,
      docker: false,
      pm2: false,
      ci: false,
      gitHooks: false,
    });
    expect(unavailable(cfg)).toEqual({ blocking: [], skipped: [] });
  });
});
