/**
 * Three-way merges for `create-prodforge add`: `base` is what the project's original options
 * generate, `theirs` what the new options generate, and `ours` what's on disk now.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const isObject = (value: Json | undefined): value is { [key: string]: Json } =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (a: Json | undefined, b: Json | undefined) => JSON.stringify(a) === JSON.stringify(b);

export interface JsonMergeResult {
  /** undefined when the key should be absent. */
  value: Json | undefined;
  /** Dotted paths where both sides changed the same key; `ours` was kept. */
  conflicts: string[];
}

/** Merge JSON values key by key, keeping your changes and taking the generator's. */
export function mergeJson(
  base: Json | undefined,
  ours: Json | undefined,
  theirs: Json | undefined,
  path = '',
): JsonMergeResult {
  if (same(ours, theirs) || same(base, theirs)) return { value: ours, conflicts: [] };
  if (same(base, ours)) return { value: theirs, conflicts: [] };
  if (isObject(ours) && isObject(theirs)) {
    const baseObject = isObject(base) ? base : {};
    const value: { [key: string]: Json } = {};
    const conflicts: string[] = [];
    for (const key of new Set([...Object.keys(ours), ...Object.keys(theirs)])) {
      const merged = mergeJson(
        baseObject[key],
        ours[key],
        theirs[key],
        path ? `${path}.${key}` : key,
      );
      conflicts.push(...merged.conflicts);
      if (merged.value !== undefined) value[key] = merged.value;
    }
    return { value, conflicts };
  }
  return { value: ours, conflicts: [path || '(root)'] };
}

const DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'];

/** mergeJson for package.json, keeping dependency lists sorted like the generator does. */
export function mergePackageJson(base: string, ours: string, theirs: string) {
  const { value, conflicts } = mergeJson(JSON.parse(base), JSON.parse(ours), JSON.parse(theirs));
  const pkg = value as { [key: string]: Json };
  for (const field of DEPENDENCY_FIELDS) {
    const deps = pkg[field];
    if (isObject(deps)) {
      pkg[field] = Object.fromEntries(
        Object.entries(deps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    }
  }
  return { content: `${JSON.stringify(pkg, null, 2)}\n`, conflicts };
}

/** Variables in `example` (KEY=value lines) that `env` doesn't set, as lines to append. */
export function missingEnvLines(example: string, env: string): string[] {
  const keyOf = (line: string) => /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line)?.[1];
  const present = new Set(env.split('\n').map(keyOf).filter(Boolean));
  return example.split('\n').filter((line) => {
    const key = keyOf(line);
    return key !== undefined && !present.has(key);
  });
}
