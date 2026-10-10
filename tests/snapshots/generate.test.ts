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

  it('leaves no slot markers behind', async () => {
    const { files } = await snapshot({ name: 'my-api' });
    for (const [path, content] of Object.entries(files)) {
      expect(content, path).not.toMatch(/@slot:/);
    }
  });
});
