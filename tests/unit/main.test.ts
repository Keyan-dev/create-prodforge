import { describe, expect, it } from 'vitest';
import pkg from '../../package.json' with { type: 'json' };
import { main } from '../../src/cli/main';

describe('main command', () => {
  it('reports the package version', () => {
    expect(main.meta).toMatchObject({ name: 'create-prodforge', version: pkg.version });
  });
});
