import { describe, expect, it } from 'vitest';
import { pick, versions } from '../../../src/core/versions';

describe('versions', () => {
  it('pins every package to an exact version', () => {
    for (const [name, version] of Object.entries(versions)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
    }
  });

  it('picks pinned versions by name', () => {
    expect(pick('zod', 'typescript')).toEqual({
      zod: versions.zod,
      typescript: versions.typescript,
    });
  });
});
