import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseConfig, type ProjectConfig } from '../../../src/core/config';
import type { Feature } from '../../../src/core/feature';
import { generate, resolveFeatures, writeProject } from '../../../src/core/pipeline';
import { VirtualFS } from '../../../src/core/vfs';

const cfg = parseConfig({ name: 'my-api' });

function feature(id: string, extra: Partial<Feature> = {}): Feature {
  return { id, label: id, enabled: () => true, apply: () => {}, ...extra };
}

const ids = (features: Feature[]) => features.map((f) => f.id);

describe('resolveFeatures', () => {
  it('keeps registry order when there are no dependencies', () => {
    expect(ids(resolveFeatures([feature('a'), feature('b'), feature('c')], cfg))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('runs a feature after the features it depends on', () => {
    const registry = [
      feature('docker', { dependsOn: ['base', 'db'] }),
      feature('db', { dependsOn: ['base'] }),
      feature('base'),
    ];
    expect(ids(resolveFeatures(registry, cfg))).toEqual(['base', 'db', 'docker']);
  });

  it('drops disabled features and ignores dependencies on them', () => {
    const registry = [
      feature('base'),
      feature('db', { enabled: (c: ProjectConfig) => c.db !== 'none' }),
      feature('docker', { dependsOn: ['db'] }),
    ];
    expect(ids(resolveFeatures(registry, parseConfig({ name: 'x', db: 'none' })))).toEqual([
      'base',
      'docker',
    ]);
  });

  it('throws when two enabled features conflict', () => {
    const registry = [
      feature('lint-eslint'),
      feature('lint-biome', { conflictsWith: ['lint-eslint'] }),
    ];
    expect(() => resolveFeatures(registry, cfg)).toThrow(
      /"lint-biome" and "lint-eslint" can't be used together/,
    );
  });

  it('allows a conflict when only one side is enabled', () => {
    const registry = [
      feature('lint-eslint', { enabled: () => false }),
      feature('lint-biome', { conflictsWith: ['lint-eslint'] }),
    ];
    expect(ids(resolveFeatures(registry, cfg))).toEqual(['lint-biome']);
  });

  it('throws on a dependency cycle', () => {
    const registry = [
      feature('a', { dependsOn: ['b'] }),
      feature('b', { dependsOn: ['a'] }),
      feature('c'),
    ];
    expect(() => resolveFeatures(registry, cfg)).toThrow(/cycle among: a, b/);
  });

  it('throws on an unknown feature id', () => {
    expect(() => resolveFeatures([feature('a', { dependsOn: ['typo'] })], cfg)).toThrow(
      /unknown feature "typo"/,
    );
    expect(() => resolveFeatures([feature('a', { conflictsWith: ['typo'] })], cfg)).toThrow(
      /unknown feature "typo"/,
    );
  });

  it('throws on duplicate ids', () => {
    expect(() => resolveFeatures([feature('a'), feature('a')], cfg)).toThrow(
      /Duplicate feature id "a"/,
    );
  });
});

describe('generate', () => {
  it('applies features in order, then injections, package.json and .env.example', async () => {
    const calls: string[] = [];
    const registry = [
      feature('helmet', {
        dependsOn: ['base'],
        apply(ctx) {
          calls.push('helmet');
          ctx.pkg.addDeps({ helmet: '8.0.0' });
          ctx.inject('src/app.ts', 'imports', "import helmet from 'helmet';");
          ctx.inject('src/app.ts', 'middleware', 'app.use(helmet());');
        },
      }),
      feature('base', {
        apply(ctx) {
          calls.push('base');
          ctx.pkg.set('name', ctx.cfg.name).addScripts({ dev: 'tsx watch src/server.ts' });
          ctx.env.add('PORT', '3000', 'HTTP port');
          ctx.files.write(
            'src/app.ts',
            ['// @slot:imports', 'const app = express();', '// @slot:middleware', ''].join('\n'),
          );
          ctx.files.write('src/server.ts', '// @slot:shutdown\nlisten();\n');
        },
        finalize(ctx) {
          calls.push('base:finalize');
          ctx.files.write(
            'deps.txt',
            Object.keys(ctx.pkg.toJSON().dependencies as object).join(','),
          );
        },
      }),
    ];

    const result = await generate(cfg, registry);

    expect(calls).toEqual(['base', 'helmet', 'base:finalize']);
    expect(result.features).toEqual(['base', 'helmet']);
    expect(result.files.paths()).toEqual([
      '.env.example',
      'deps.txt',
      'package.json',
      'src/app.ts',
      'src/server.ts',
    ]);
    expect(result.files.read('src/app.ts')).toBe(
      "import helmet from 'helmet';\nconst app = express();\napp.use(helmet());\n",
    );
    expect(result.files.read('src/server.ts')).toBe('listen();\n');
    expect(result.files.read('deps.txt')).toBe('helmet');
    expect(JSON.parse(result.files.read('package.json'))).toEqual({
      name: 'my-api',
      scripts: { dev: 'tsx watch src/server.ts' },
      dependencies: { helmet: '^8.0.0' },
    });
    expect(result.files.read('.env.example')).toBe('# HTTP port\nPORT=3000\n');
  });

  it('throws when injecting into a file no feature wrote', async () => {
    const registry = [
      feature('x', { apply: (ctx) => ctx.inject('src/missing.ts', 'imports', '') }),
    ];
    await expect(generate(cfg, registry)).rejects.toThrow(/Can't inject into src\/missing.ts/);
  });

  it('skips an optional injection when the file is missing', async () => {
    const registry = [
      feature('x', {
        apply(ctx) {
          ctx.files.write('a.ts', '// @slot:imports\n');
          ctx.inject('Dockerfile', 'install-files', 'COPY x ./', { optional: true });
          ctx.inject('a.ts', 'imports', 'import x;', { optional: true });
        },
      }),
    ];
    const result = await generate(cfg, registry);
    expect(result.files.has('Dockerfile')).toBe(false);
    expect(result.files.read('a.ts')).toBe('import x;\n');
  });

  it('surfaces package.json conflicts between features', async () => {
    const registry = [
      feature('a', { apply: (ctx) => void ctx.pkg.addDeps({ zod: '4.6.5' }) }),
      feature('b', { apply: (ctx) => void ctx.pkg.addDeps({ zod: '3.25.0' }) }),
    ];
    await expect(generate(cfg, registry)).rejects.toThrow(/Conflicting dependency "zod"/);
  });
});

describe('writeProject', () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  const files = () => {
    const vfs = new VirtualFS();
    vfs.write('package.json', '{}\n');
    return vfs;
  };

  it('writes into a missing or empty directory', async () => {
    dir = await mkdtemp(join(tmpdir(), 'prodforge-write-'));
    const target = join(dir, 'new-app');
    await writeProject(files(), target);
    expect(await readFile(join(target, 'package.json'), 'utf8')).toBe('{}\n');
  });

  it('refuses a non-empty directory unless forced', async () => {
    dir = await mkdtemp(join(tmpdir(), 'prodforge-write-'));
    await writeFile(join(dir, 'keep.txt'), 'x');
    await expect(writeProject(files(), dir)).rejects.toThrow(/is not empty/);
    await writeProject(files(), dir, { force: true });
    expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe('{}\n');
  });
});
