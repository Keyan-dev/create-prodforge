import { describe, expect, it } from 'vitest';
import { useLatestVersions } from '../../../src/utils/latest';

describe('useLatestVersions', () => {
  const pkg = `${JSON.stringify(
    {
      name: 'x',
      dependencies: { 'express': '^5.0.0', '@scope/a': '^1.0.0' },
      devDependencies: {
        'vitest': '^4.0.0',
        'gone': '^1.0.0',
        'rc': '^1.0.0',
        '@types/node': '^24.0.0',
      },
    },
    null,
    2,
  )}\n`;
  const registry: Record<string, string> = {
    'express': '5.2.0',
    '@scope/a': '1.0.0',
    'vitest': '5.0.0',
    'rc': '2.0.0-rc.1',
    '@types/node': '26.0.0',
  };
  const latest = async (name: string) => {
    const version = registry[name];
    if (!version) throw new Error('404 Not Found');
    return version;
  };

  it('moves every dependency to the latest release and reports what changed', async () => {
    const result = await useLatestVersions(pkg, latest);
    expect(JSON.parse(result.content)).toEqual({
      name: 'x',
      dependencies: { 'express': '^5.2.0', '@scope/a': '^1.0.0' },
      devDependencies: {
        'vitest': '^5.0.0',
        'gone': '^1.0.0',
        'rc': '^1.0.0',
        '@types/node': '^24.0.0',
      },
    });
    expect(result.updated).toEqual([
      { name: 'express', from: '^5.0.0', to: '^5.2.0' },
      { name: 'vitest', from: '^4.0.0', to: '^5.0.0' },
    ]);
  });

  it('keeps the pin for a missing package or a prerelease, and @types/node as is', async () => {
    const { failed } = await useLatestVersions(pkg, latest);
    expect(failed).toEqual([
      { name: 'gone', reason: '404 Not Found' },
      { name: 'rc', reason: 'latest is a prerelease, 2.0.0-rc.1' },
    ]);
  });
});
