import { describe, expect, it } from 'vitest';
import { PackageJsonBuilder } from '../../../src/core/package-json';

describe('PackageJsonBuilder', () => {
  it('merges contributions from several features', () => {
    const pkg = new PackageJsonBuilder()
      .set('name', 'my-api')
      .addDeps({ express: '5.3.0' })
      .addScripts({ build: 'tsdown' })
      .addDeps({ zod: '4.6.5' })
      .addScripts({ test: 'vitest run' });

    expect(pkg.toJSON()).toEqual({
      name: 'my-api',
      scripts: { build: 'tsdown', test: 'vitest run' },
      dependencies: { express: '^5.3.0', zod: '^4.6.5' },
    });
  });

  it('accepts the same dependency twice when the versions agree', () => {
    const pkg = new PackageJsonBuilder()
      .addDevDeps({ vitest: '5.0.3' })
      .addDevDeps({ vitest: '5.0.3' });
    expect(pkg.toJSON()).toEqual({ devDependencies: { vitest: '^5.0.3' } });
  });

  it('throws on a conflicting dependency version', () => {
    const pkg = new PackageJsonBuilder().addDeps({ zod: '4.6.5' });
    expect(() => pkg.addDeps({ zod: '3.25.0' })).toThrow(/Conflicting dependency "zod"/);
  });

  it('throws on a conflicting script', () => {
    const pkg = new PackageJsonBuilder().addScripts({ dev: 'tsx watch src/server.ts' });
    expect(() => pkg.addScripts({ dev: 'node dist/server.js' })).toThrow(
      /Conflicting script "dev"/,
    );
  });

  it('keeps a package only in dependencies when both lists have it', () => {
    const pkg = new PackageJsonBuilder()
      .addDevDeps({ zod: '4.6.5', tsx: '4.23.15' })
      .addDeps({ zod: '4.6.5' });
    expect(pkg.toJSON()).toEqual({
      dependencies: { zod: '^4.6.5' },
      devDependencies: { tsx: '^4.23.15' },
    });
  });

  it('sorts dependencies and orders top-level keys conventionally', () => {
    const pkg = new PackageJsonBuilder()
      .addDeps({ zod: '4.6.5', express: '5.3.0' })
      .set('zzz', true)
      .set('type', 'module')
      .set('name', 'x')
      .set('aaa', true);

    const json = pkg.toJSON();
    expect(Object.keys(json)).toEqual(['name', 'type', 'dependencies', 'aaa', 'zzz']);
    expect(Object.keys(json.dependencies as object)).toEqual(['express', 'zod']);
  });

  it('leaves non-numeric version specifiers alone', () => {
    const pkg = new PackageJsonBuilder().addDeps({ local: 'workspace:*' });
    expect(pkg.toJSON()).toEqual({ dependencies: { local: 'workspace:*' } });
  });

  it('refuses to set dependency maps directly', () => {
    expect(() => new PackageJsonBuilder().set('dependencies', {})).toThrow(/addDeps/);
  });

  it('serializes with two-space indent and a trailing newline', () => {
    expect(new PackageJsonBuilder().set('name', 'x').toString()).toBe('{\n  "name": "x"\n}\n');
  });
});
