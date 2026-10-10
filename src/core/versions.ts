/**
 * Every dependency version used in generated projects. This is the only file that may hold a
 * version string for them (CLAUDE.md). Renovate updates these through the custom manager in
 * `renovate.json`, so keep one `'name': 'x.y.z',` entry per line.
 *
 * Values are exact versions; `package-json.ts` writes them as caret ranges.
 */
export const versions = {
  // runtime
  'express': '5.3.0',
  'zod': '4.6.5',
  // tooling
  '@types/express': '5.0.6',
  '@types/node': '24.19.2',
  'tsdown': '0.23.1',
  'tsx': '4.23.15',
  'typescript': '6.0.3',
  'vitest': '5.0.3',
} as const;

export type PackageName = keyof typeof versions;

/** Pick pinned versions for the given packages, ready for `pkg.addDeps()` / `addDevDeps()`. */
export function pick<const K extends PackageName>(...names: K[]): Record<K, string> {
  const picked = {} as Record<K, string>;
  for (const name of names) picked[name] = versions[name];
  return picked;
}
