type DepMap = Record<string, string>;

/** Conventional key order for the generated package.json. Unknown keys go after, sorted. */
const KEY_ORDER = [
  'name',
  'version',
  'private',
  'description',
  'license',
  'type',
  'main',
  'bin',
  'files',
  'engines',
  'packageManager',
  'scripts',
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

const DEP_FIELDS = new Set(['dependencies', 'devDependencies']);

/** Turn a pinned version from versions.ts into the range written to package.json. */
function toRange(version: string): string {
  return /^\d/.test(version) ? `^${version}` : version;
}

function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Collects package.json contributions from every feature. Adding the same dependency or script
 * twice is fine when the values agree; a disagreement throws, because it means two features
 * have conflicting opinions and silently picking one would hide a bug.
 */
export class PackageJsonBuilder {
  readonly #fields: Record<string, unknown> = {};
  readonly #deps: DepMap = {};
  readonly #devDeps: DepMap = {};
  readonly #scripts: Record<string, string> = {};

  /** Set a top-level field such as `name`, `type` or `engines`. */
  set(key: string, value: unknown): this {
    if (DEP_FIELDS.has(key) || key === 'scripts') {
      throw new Error(`Use addDeps/addDevDeps/addScripts instead of set('${key}')`);
    }
    this.#fields[key] = value;
    return this;
  }

  addDeps(deps: DepMap): this {
    return this.#merge(this.#deps, deps, 'dependency');
  }

  addDevDeps(deps: DepMap): this {
    return this.#merge(this.#devDeps, deps, 'devDependency');
  }

  addScripts(scripts: Record<string, string>): this {
    return this.#merge(this.#scripts, scripts, 'script');
  }

  #merge(target: Record<string, string>, incoming: Record<string, string>, kind: string): this {
    for (const [name, value] of Object.entries(incoming)) {
      const existing = target[name];
      if (existing !== undefined && existing !== value) {
        throw new Error(`Conflicting ${kind} "${name}": "${existing}" vs "${value}"`);
      }
      target[name] = value;
    }
    return this;
  }

  /**
   * The final object. Versions become caret ranges, dependency maps and scripts are sorted, and
   * a package listed as both a runtime and a dev dependency stays only in `dependencies`.
   */
  toJSON(): Record<string, unknown> {
    const devDeps = Object.fromEntries(
      Object.entries(this.#devDeps).filter(([name]) => !(name in this.#deps)),
    );
    const all: Record<string, unknown> = { ...this.#fields };
    if (Object.keys(this.#scripts).length) all.scripts = sortKeys(this.#scripts);
    if (Object.keys(this.#deps).length) {
      all.dependencies = sortKeys(
        Object.fromEntries(Object.entries(this.#deps).map(([n, v]) => [n, toRange(v)])),
      );
    }
    if (Object.keys(devDeps).length) {
      all.devDependencies = sortKeys(
        Object.fromEntries(Object.entries(devDeps).map(([n, v]) => [n, toRange(v)])),
      );
    }

    const known = KEY_ORDER.filter((key) => key in all);
    const rest = Object.keys(all)
      .filter((key) => !(KEY_ORDER as readonly string[]).includes(key))
      .sort();
    return Object.fromEntries([...known, ...rest].map((key) => [key, all[key]]));
  }

  toString(): string {
    return `${JSON.stringify(this.toJSON(), null, 2)}\n`;
  }
}
