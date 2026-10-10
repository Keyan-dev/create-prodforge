import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** ESLint (flat config, typescript-eslint) for code quality and Prettier for formatting. */
export const lintEslint: Feature = {
  id: 'lint-eslint',
  label: 'ESLint + Prettier',
  enabled: (cfg) => cfg.lint === 'eslint',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg
      .addDevDeps(
        pick(
          '@eslint/js',
          'eslint',
          'eslint-config-prettier',
          'globals',
          'prettier',
          'typescript-eslint',
        ),
      )
      .addScripts({
        'lint': 'eslint .',
        'format': 'prettier --write .',
        'format:check': 'prettier --check .',
      });
    await ctx.files.copyDir(featureFiles('lint-eslint'));
  },
};
