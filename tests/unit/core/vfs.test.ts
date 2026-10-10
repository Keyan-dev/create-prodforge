import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VirtualFS } from '../../../src/core/vfs';

describe('VirtualFS', () => {
  it('normalizes paths', () => {
    const vfs = new VirtualFS();
    vfs.write('./src//app.ts', 'a');
    vfs.write('src\\lib\\x.ts', 'b');
    expect(vfs.paths()).toEqual(['src/app.ts', 'src/lib/x.ts']);
    expect(vfs.read('src/./app.ts')).toBe('a');
  });

  it.each(['/etc/passwd', '../outside', 'src/../../x', 'C:/x', '.'])('rejects %j', (path) => {
    expect(() => new VirtualFS().write(path, '')).toThrow();
  });

  it('lists files sorted regardless of write order', () => {
    const vfs = new VirtualFS();
    vfs.write('b.ts', '');
    vfs.write('a/z.ts', '');
    vfs.write('a.ts', '');
    expect(vfs.paths()).toEqual(['a.ts', 'a/z.ts', 'b.ts']);
    expect(vfs.entries().map(([path]) => path)).toEqual(vfs.paths());
  });

  it('throws when reading a missing file', () => {
    expect(() => new VirtualFS().read('nope')).toThrow(/No such file/);
  });

  describe('flush', () => {
    let dir: string | undefined;
    afterEach(async () => {
      if (dir) await rm(dir, { recursive: true, force: true });
    });

    it('writes nested files and the executable bit', async () => {
      dir = await mkdtemp(join(tmpdir(), 'prodforge-vfs-'));
      const vfs = new VirtualFS();
      vfs.write('src/app.ts', 'export {};\n');
      vfs.write('.husky/pre-commit', 'pnpm lint-staged\n', { executable: true });
      await vfs.flush(dir);

      expect(await readFile(join(dir, 'src/app.ts'), 'utf8')).toBe('export {};\n');
      if (process.platform !== 'win32') {
        expect((await stat(join(dir, '.husky/pre-commit'))).mode & 0o111).not.toBe(0);
      }
    });
  });
});
