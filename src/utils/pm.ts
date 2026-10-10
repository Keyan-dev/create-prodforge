import type { ProjectConfig } from '../core/config';

export type PackageManager = ProjectConfig['packageManager'];

const KNOWN: PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

/**
 * Work out which package manager invoked us. `npm create`, `pnpm create`, `yarn create` and
 * `bun create` all set `npm_config_user_agent` (e.g. `pnpm/10.28.0 npm/? node/v24.1.0`).
 * Without it (a bare `npx` or `node dist/index.js`) we use pnpm when it's installed, else npm.
 */
export function detectPackageManager(
  userAgent: string | undefined,
  hasPnpm: () => boolean,
): PackageManager {
  const name = userAgent?.split('/')[0];
  if (name && (KNOWN as string[]).includes(name)) return name as PackageManager;
  return hasPnpm() ? 'pnpm' : 'npm';
}

/** How to run a package.json script with this package manager (`npm run dev` vs `pnpm dev`). */
export function runCommand(pm: PackageManager, script: string): string {
  return pm === 'npm' ? `npm run ${script}` : `${pm} ${script}`;
}
