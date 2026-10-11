import type { ProjectConfig } from '../../core/config';
import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { actions } from '../../core/versions';

type Pm = ProjectConfig['packageManager'];

/** Clean install from the lockfile, failing if it is out of date. */
const INSTALL: Record<Pm, string> = {
  pnpm: 'pnpm install --frozen-lockfile',
  npm: 'npm ci',
  yarn: 'yarn install --frozen-lockfile',
  bun: 'bun install --frozen-lockfile',
};

const RUN: Record<Pm, string> = { pnpm: 'pnpm', npm: 'npm run', yarn: 'yarn', bun: 'bun run' };

/**
 * A GitHub Actions workflow for the generated project: on every push to main and every pull
 * request it installs from the lockfile, then runs lint, format check, typecheck, tests and the
 * build. Other features add jobs through the `jobs` slot (the docker feature adds an image build).
 */
export const ciGithub: Feature = {
  id: 'ci-github',
  label: 'GitHub Actions CI',
  enabled: (cfg) => cfg.ci,
  dependsOn: ['base'],
  async apply(ctx) {
    const pm = ctx.cfg.packageManager;
    await ctx.files.copyDir(featureFiles('ci-github'), '.', {
      actions,
      install: INSTALL[pm],
      run: RUN[pm],
      // setup-node caches the package manager's store, keyed on the lockfile. Bun isn't supported.
      cache: pm === 'bun' ? undefined : pm,
    });
  },
};
