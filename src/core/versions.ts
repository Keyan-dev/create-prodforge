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
  'helmet': '8.3.0',
  'zod': '4.6.5',
  // build and types
  '@types/express': '5.0.6',
  '@types/node': '24.19.2',
  'tsdown': '0.23.1',
  'tsx': '4.23.15',
  'typescript': '6.0.3',
  // testing
  '@types/supertest': '7.2.1',
  'supertest': '7.3.1',
  '@vitest/coverage-v8': '5.0.3',
  'vitest': '5.0.3',
  // lint and format
  '@eslint/js': '10.0.1',
  'eslint': '10.12.0',
  'eslint-config-prettier': '10.1.8',
  'globals': '17.13.0',
  'prettier': '3.9.10',
  'typescript-eslint': '8.71.1',
} as const;

export type PackageName = keyof typeof versions;

/** Pick pinned versions for the given packages, ready for `pkg.addDeps()` / `addDevDeps()`. */
export function pick<const K extends PackageName>(...names: K[]): Record<K, string> {
  const picked = {} as Record<K, string>;
  for (const name of names) picked[name] = versions[name];
  return picked;
}
