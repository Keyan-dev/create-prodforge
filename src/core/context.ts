import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { ProjectConfig } from './config';
import { PackageJsonBuilder } from './package-json';
import { render, TEMPLATE_SUFFIX } from './render';
import type { Injection } from './slots';
import { VirtualFS } from './vfs';

export interface EnvVar {
  key: string;
  example: string;
  description: string;
}

/** Environment variables the project needs. Becomes `.env.example`. */
export class EnvRegistry {
  readonly #vars = new Map<string, EnvVar>();

  add(key: string, example: string, description: string): void {
    const existing = this.#vars.get(key);
    if (existing && existing.example !== example) {
      throw new Error(`Conflicting env var ${key}: "${existing.example}" vs "${example}"`);
    }
    this.#vars.set(key, { key, example, description });
  }

  /** In the order they were added, so related vars stay together. */
  list(): EnvVar[] {
    return [...this.#vars.values()];
  }

  toString(): string {
    return this.list()
      .map(({ key, example, description }) => `# ${description}\n${key}=${example}\n`)
      .join('\n');
  }
}

/** Docker Compose services other features need (Postgres, Redis, …). The docker feature writes them. */
export class ComposeRegistry {
  readonly #services = new Map<string, Record<string, unknown>>();

  addService(name: string, definition: Record<string, unknown>): void {
    if (this.#services.has(name)) throw new Error(`Compose service "${name}" is already defined`);
    this.#services.set(name, definition);
  }

  services(): Record<string, Record<string, unknown>> {
    return Object.fromEntries(this.#services);
  }
}

/** File helpers for features. Everything lands in the virtual FS. */
export class FeatureFiles {
  constructor(
    readonly vfs: VirtualFS,
    readonly cfg: ProjectConfig,
  ) {}

  write(path: string, content: string, options?: { executable?: boolean }): void {
    this.vfs.write(path, content, options);
  }

  /** Render an eta template string with `{ cfg }` and write the result. */
  render(path: string, template: string): void {
    this.vfs.write(path, render(template, { cfg: this.cfg }));
  }

  /**
   * Copy a template directory from disk into the project. Files ending in `.eta` are rendered
   * and lose the suffix; everything else is copied verbatim.
   */
  async copyDir(sourceDir: string, destDir = '.'): Promise<void> {
    const entries = await readdir(sourceDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const source = join(entry.parentPath, entry.name);
      const rel = relative(sourceDir, source).replaceAll('\\', '/');
      const content = await readFile(source, 'utf8');
      const dest = destDir === '.' ? rel : `${destDir}/${rel}`;
      if (rel.endsWith(TEMPLATE_SUFFIX)) {
        this.render(dest.slice(0, -TEMPLATE_SUFFIX.length), content);
      } else {
        this.write(dest, content);
      }
    }
  }
}

/** Everything a feature can touch while generating a project. */
export class GeneratorContext {
  readonly files: FeatureFiles;
  readonly pkg = new PackageJsonBuilder();
  readonly env = new EnvRegistry();
  readonly compose = new ComposeRegistry();
  readonly #injections: Injection[] = [];

  constructor(
    readonly cfg: ProjectConfig,
    readonly vfs: VirtualFS = new VirtualFS(),
  ) {
    this.files = new FeatureFiles(vfs, cfg);
  }

  /**
   * Queue `code` for the `@slot:<slot>` marker in `path`. Injections are applied after every
   * feature has run, so the file may be written by a feature that runs later.
   */
  inject(path: string, slot: string, code: string): void {
    this.#injections.push({ path, slot, code });
  }

  get injections(): readonly Injection[] {
    return this.#injections;
  }
}
