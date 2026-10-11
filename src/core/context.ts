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

/**
 * What other features need from Docker Compose: services (Postgres, Redis, …), named volumes,
 * environment for the app container, and a migration script to run before the app starts. The
 * docker feature turns this into compose.yaml.
 */
export class ComposeRegistry {
  readonly #services = new Map<string, Record<string, unknown>>();
  readonly #volumes = new Set<string>();
  readonly #appEnv = new Map<string, string>();
  #migrateScript: string | undefined;
  readonly #processes = new Map<string, string[]>();

  addService(name: string, definition: Record<string, unknown>): void {
    if (this.#services.has(name)) throw new Error(`Compose service "${name}" is already defined`);
    this.#services.set(name, definition);
  }

  services(): Record<string, Record<string, unknown>> {
    return Object.fromEntries(this.#services);
  }

  addVolume(name: string): void {
    this.#volumes.add(name);
  }

  volumes(): string[] {
    return [...this.#volumes];
  }

  /** Env vars for the app container, e.g. a DATABASE_URL that points at a compose service. */
  addAppEnv(key: string, value: string): void {
    const existing = this.#appEnv.get(key);
    if (existing !== undefined && existing !== value) {
      throw new Error(`Conflicting compose env var ${key}: "${existing}" vs "${value}"`);
    }
    this.#appEnv.set(key, value);
  }

  appEnv(): Record<string, string> {
    return Object.fromEntries(this.#appEnv);
  }

  /** A package.json script that applies migrations; compose runs it once before the app. */
  setMigrateScript(script: string): void {
    if (this.#migrateScript && this.#migrateScript !== script) {
      throw new Error(`Conflicting migrate scripts: "${this.#migrateScript}" vs "${script}"`);
    }
    this.#migrateScript = script;
  }

  migrateScript(): string | undefined {
    return this.#migrateScript;
  }

  /**
   * Another long-running process from the app image, such as a queue worker. It gets the app's
   * environment and dependencies but no port or HTTP health check.
   */
  addAppProcess(name: string, command: string[]): void {
    if (this.#processes.has(name)) throw new Error(`Compose process "${name}" is already defined`);
    this.#processes.set(name, command);
  }

  appProcesses(): Record<string, string[]> {
    return Object.fromEntries(this.#processes);
  }
}

function toDotfile(segment: string): string {
  return /^_[^_]/.test(segment) ? `.${segment.slice(1)}` : segment;
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

  /** Render an eta template string with `{ cfg, ...data }` and write the result. */
  render(path: string, template: string, data: Record<string, unknown> = {}): void {
    this.vfs.write(path, render(template, { ...data, cfg: this.cfg }));
  }

  /**
   * Copy a template directory from disk into the project. Files ending in `.eta` are rendered
   * and lose the suffix; everything else is copied verbatim. A path segment starting with a
   * single `_` becomes a dotfile (`_gitignore` → `.gitignore`), because npm drops some dotfiles
   * such as `.gitignore` from published packages. `data` is passed to templates next to `cfg`.
   */
  async copyDir(
    sourceDir: string,
    destDir = '.',
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const entries = await readdir(sourceDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const source = join(entry.parentPath, entry.name);
      const rel = relative(sourceDir, source)
        .replaceAll('\\', '/')
        .split('/')
        .map(toDotfile)
        .join('/');
      const content = await readFile(source, 'utf8');
      const dest = destDir === '.' ? rel : `${destDir}/${rel}`;
      if (rel.endsWith(TEMPLATE_SUFFIX)) {
        this.render(dest.slice(0, -TEMPLATE_SUFFIX.length), content, data);
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
   * feature has run, so the file may be written by a feature that runs later. With `optional`,
   * a file that no feature wrote is skipped instead of being an error.
   */
  inject(path: string, slot: string, code: string, options: { optional?: boolean } = {}): void {
    this.#injections.push({ path, slot, code, ...options });
  }

  get injections(): readonly Injection[] {
    return this.#injections;
  }
}
