import { describe, expect, it } from 'vitest';
import { images, pick, versions } from '../../../src/core/versions';

describe('versions', () => {
  it('pins every package to an exact version', () => {
    for (const [name, version] of Object.entries(versions)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
    }
  });

  it('tags every compose image', () => {
    for (const image of Object.values(images)) expect(image).toMatch(/^[a-z0-9./-]+:[\w.-]+$/);
  });

  it('picks pinned versions by name', () => {
    expect(pick('zod', 'typescript')).toEqual({
      zod: versions.zod,
      typescript: versions.typescript,
    });
  });
});
