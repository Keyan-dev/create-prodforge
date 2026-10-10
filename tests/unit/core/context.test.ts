import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/core/config';
import { ComposeRegistry, EnvRegistry, GeneratorContext } from '../../../src/core/context';

const fixtures = join(import.meta.dirname, '../../fixtures/templates');

describe('FeatureFiles.copyDir', () => {
  it('renders .eta files without the suffix and copies the rest verbatim', async () => {
    const ctx = new GeneratorContext(parseConfig({ name: 'my-api' }));
    await ctx.files.copyDir(fixtures);

    expect(ctx.vfs.paths()).toEqual(['.gitignore', 'README.md', '__keep__/file.txt', 'src/app.ts']);
    expect(ctx.vfs.read('src/app.ts')).toBe('export const name = "my-api";\n');
    expect(ctx.vfs.read('README.md')).toBe('plain <%= not rendered %>\n');
  });

  it('turns a leading single underscore into a dot, leaving double underscores alone', async () => {
    const ctx = new GeneratorContext(parseConfig({ name: 'my-api' }));
    await ctx.files.copyDir(fixtures);
    expect(ctx.vfs.read('.gitignore')).toBe('dist/\n');
    expect(ctx.vfs.has('__keep__/file.txt')).toBe(true);
  });

  it('copies into a destination directory', async () => {
    const ctx = new GeneratorContext(parseConfig({ name: 'my-api' }));
    await ctx.files.copyDir(fixtures, 'packages/api');
    expect(ctx.vfs.paths()).toContain('packages/api/src/app.ts');
  });
});

describe('EnvRegistry', () => {
  it('renders .env.example in insertion order', () => {
    const env = new EnvRegistry();
    env.add('PORT', '3000', 'HTTP port');
    env.add('DATABASE_URL', 'postgresql://localhost/app', 'Postgres connection');
    env.add('PORT', '3000', 'HTTP port');
    expect(env.toString()).toBe(
      '# HTTP port\nPORT=3000\n\n# Postgres connection\nDATABASE_URL=postgresql://localhost/app\n',
    );
  });

  it('throws on a conflicting example value', () => {
    const env = new EnvRegistry();
    env.add('PORT', '3000', 'HTTP port');
    expect(() => env.add('PORT', '8080', 'HTTP port')).toThrow(/Conflicting env var PORT/);
  });
});

describe('ComposeRegistry', () => {
  it('collects services and rejects duplicates', () => {
    const compose = new ComposeRegistry();
    compose.addService('postgres', { image: 'postgres:18' });
    expect(compose.services()).toEqual({ postgres: { image: 'postgres:18' } });
    expect(() => compose.addService('postgres', {})).toThrow(/already defined/);
  });
});
