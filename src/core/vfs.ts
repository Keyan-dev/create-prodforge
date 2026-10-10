import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { normalizePath } from './paths';

export interface VirtualFile {
  content: string;
  /** Mark the file executable when it's written to disk (e.g. Husky hooks). */
  executable?: boolean;
}

/**
 * In-memory project tree. Features only ever write here; nothing touches disk until `flush()`
 * runs at the end of a successful pipeline. That's what makes `--dry-run` and snapshots cheap.
 */
export class VirtualFS {
  readonly #files = new Map<string, VirtualFile>();

  write(path: string, content: string, options: { executable?: boolean } = {}): void {
    this.#files.set(normalizePath(path), { content, ...options });
  }

  read(path: string): string {
    const file = this.#files.get(normalizePath(path));
    if (!file) throw new Error(`No such file in the virtual FS: ${path}`);
    return file.content;
  }

  has(path: string): boolean {
    return this.#files.has(normalizePath(path));
  }

  delete(path: string): boolean {
    return this.#files.delete(normalizePath(path));
  }

  /** Every path, sorted, so output order never depends on feature order. */
  paths(): string[] {
    return [...this.#files.keys()].sort();
  }

  /** Sorted `[path, file]` pairs. */
  entries(): [string, VirtualFile][] {
    return [...this.#files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }

  /** Write every file under `root`. The caller decides whether `root` may already exist. */
  async flush(root: string): Promise<void> {
    for (const [path, file] of this.entries()) {
      const target = join(root, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
      if (file.executable) await chmod(target, 0o755);
    }
  }
}
