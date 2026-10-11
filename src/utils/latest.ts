/** Look up the version npm's `latest` tag points at. */
export type LatestVersion = (name: string) => Promise<string>;

export const fetchLatestVersion: LatestVersion = async (name) => {
  const url = `https://registry.npmjs.org/${name.replace('/', '%2F')}/latest`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const { version } = (await response.json()) as { version?: unknown };
  if (typeof version !== 'string') throw new Error('no version in the response');
  return version;
};

export interface LatestResult {
  content: string;
  updated: { name: string; from: string; to: string }[];
  failed: { name: string; reason: string }[];
}

/** Packages whose version follows another choice, not npm's latest. */
const FOLLOWS_CONFIG = new Set([
  // Matches the Node.js major the project targets.
  '@types/node',
]);

/**
 * Point every dependency in a package.json at npm's latest release (keeping the caret range).
 * A package that can't be looked up, or whose `latest` tag is a prerelease, keeps its pinned
 * version and is reported in `failed`.
 */
export async function useLatestVersions(
  packageJson: string,
  latest: LatestVersion = fetchLatestVersion,
): Promise<LatestResult> {
  const pkg = JSON.parse(packageJson) as Record<string, unknown>;
  const result: LatestResult = { content: packageJson, updated: [], failed: [] };

  for (const field of ['dependencies', 'devDependencies'] as const) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;
    await Promise.all(
      Object.entries(deps).map(async ([name, range]) => {
        if (FOLLOWS_CONFIG.has(name)) return;
        try {
          const version = await latest(name);
          if (version.includes('-')) throw new Error(`latest is a prerelease, ${version}`);
          const next = `^${version}`;
          if (next !== range) {
            deps[name] = next;
            result.updated.push({ name, from: range, to: next });
          }
        } catch (error) {
          result.failed.push({
            name,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }
  result.updated.sort((a, b) => a.name.localeCompare(b.name));
  result.failed.sort((a, b) => a.name.localeCompare(b.name));
  result.content = `${JSON.stringify(pkg, null, 2)}\n`;
  return result;
}
