import { describe, expect, it } from 'vitest';
import { parseConfig, type ProjectConfigInput } from '../../src/core/config';
import { generate } from '../../src/core/pipeline';
import { features } from '../../src/features';

async function snapshot(input: ProjectConfigInput) {
  const { files, features: ran } = await generate(parseConfig(input), features);
  return {
    features: ran,
    files: Object.fromEntries(files.entries().map(([path, file]) => [path, file.content])),
  };
}

// One case per option that changes output. Review snapshot diffs like code.
describe('generated project', () => {
  it('--yes defaults (express, vitest, eslint, pnpm, node 24)', async () => {
    expect(await snapshot({ name: 'my-api' })).toMatchSnapshot();
  });

  it('npm on node 22', async () => {
    const result = await snapshot({ name: 'my-api', packageManager: 'npm', node: '22' });
    expect(result.files['package.json']).toMatchSnapshot();
    expect(result.files['README.md']).toMatchSnapshot();
    expect(result.files['.nvmrc']).toBe('22\n');
    expect(result.files['tsdown.config.ts']).toContain("target: 'node22'");
  });

  it('without docker and pm2', async () => {
    const { files } = await snapshot({ name: 'my-api', docker: false, pm2: false });
    expect(Object.keys(files)).not.toContain('Dockerfile');
    expect(Object.keys(files)).not.toContain('ecosystem.config.cjs');
    expect(files['README.md']).not.toMatch(/## Docker|## PM2/);
  });

  it('npm Dockerfile', async () => {
    const { files } = await snapshot({ name: 'my-api', packageManager: 'npm' });
    expect(files['Dockerfile']).toMatchSnapshot();
  });

  it('yarn gets no Dockerfile yet', async () => {
    const { files } = await snapshot({ name: 'my-api', packageManager: 'yarn' });
    expect(Object.keys(files)).not.toContain('Dockerfile');
    expect(files['package.json']).not.toContain('packageManager');
  });

  // The files a database choice changes, so each snapshot stays reviewable.
  const DB_FILES =
    /^(package\.json|compose\.yaml|README\.md|\.env\.example|src\/(server|app)\.ts|src\/config\/env\.ts|src\/db\/|src\/modules\/users\/|drizzle|prisma|tests\/users)/;
  const dbFiles = (files: Record<string, string>) =>
    Object.fromEntries(Object.entries(files).filter(([path]) => DB_FILES.test(path)));

  it.each(['drizzle', 'mongoose'] as const)('--db %s', async (db) => {
    const { files, features: ran } = await snapshot({ name: 'my-api', db });
    expect(ran).toContain(`db-${db}`);
    expect(dbFiles(files)).toMatchSnapshot();
  });

  it('--db none has no database or users module', async () => {
    const { files } = await snapshot({ name: 'my-api', db: 'none' });
    expect(Object.keys(files).filter((path) => /db|users|prisma/.test(path))).toEqual([]);
    expect(files['compose.yaml']).toMatchSnapshot();
    expect(files['src/server.ts']).toMatchSnapshot();
  });

  it('prisma without the example module', async () => {
    const { files } = await snapshot({ name: 'my-api', example: false });
    expect(files['prisma/schema.prisma']).not.toContain('model User');
    expect(Object.keys(files).filter((path) => /users|migrations\/\d/.test(path))).toEqual([]);
  });

  it('drizzle without the example module', async () => {
    const { files } = await snapshot({ name: 'my-api', db: 'drizzle', example: false });
    expect(files['src/db/schema.ts']).toMatchSnapshot();
    expect(Object.keys(files).filter((path) => /users|drizzle\//.test(path))).toEqual([
      'drizzle/meta/_journal.json',
    ]);
    expect(files['drizzle/meta/_journal.json']).toContain('"entries": []');
  });

  it.each(['prisma', 'drizzle', 'mongoose', 'none'] as const)(
    'leaves no slot markers behind (%s)',
    async (db) => {
      const { files } = await snapshot({ name: 'my-api', db });
      for (const [path, content] of Object.entries(files)) {
        expect(content, path).not.toMatch(/@slot:/);
      }
    },
  );
});
