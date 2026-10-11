import type { ProjectConfig } from '../../core/config';
import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** How each package manager runs a locally installed binary. */
const EXEC: Record<ProjectConfig['packageManager'], string> = {
  pnpm: 'pnpm exec',
  npm: 'npx --no --',
  yarn: 'yarn',
  bun: 'bunx',
};

/** What lint-staged runs on staged files, per linter. Globs don't overlap, so they can run in parallel. */
const LINT_STAGED: Record<ProjectConfig['lint'], Record<string, string | string[]>> = {
  eslint: {
    '*.{js,mjs,cjs,ts,mts,cts}': ['eslint --fix', 'prettier --write'],
    '*.{json,jsonc,md,yml,yaml}': 'prettier --write',
  },
  biome: {
    '*': 'biome check --write --no-errors-on-unmatched --files-ignore-unknown=true',
  },
};

/**
 * Git hooks with Husky: pre-commit runs lint-staged (lint and format only the staged files),
 * commit-msg runs commitlint (Conventional Commits). `prepare` installs the hooks on every
 * install, so they work for anyone who clones the repository.
 */
export const gitHooks: Feature = {
  id: 'git-hooks',
  label: 'Husky + lint-staged + commitlint',
  enabled: (cfg) => cfg.gitHooks,
  dependsOn: ['base'],
  async apply(ctx) {
    const exec = EXEC[ctx.cfg.packageManager];
    ctx.pkg
      .addDevDeps(
        pick('@commitlint/cli', '@commitlint/config-conventional', 'husky', 'lint-staged'),
      )
      .addScripts({ prepare: 'husky' })
      .set('lint-staged', LINT_STAGED[ctx.cfg.lint]);
    ctx.files.write('.husky/pre-commit', `${exec} lint-staged\n`);
    ctx.files.write('.husky/commit-msg', `${exec} commitlint --edit "$1"\n`);
    await ctx.files.copyDir(featureFiles('git-hooks'));
  },
};
