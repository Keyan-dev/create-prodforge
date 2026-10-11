import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** Biome: one fast tool for linting and formatting, in place of ESLint + Prettier. */
export const lintBiome: Feature = {
  id: 'lint-biome',
  label: 'Biome',
  enabled: (cfg) => cfg.lint === 'biome',
  dependsOn: ['base'],
  conflictsWith: ['lint-eslint'],
  async apply(ctx) {
    ctx.pkg.addDevDeps(pick('@biomejs/biome')).addScripts({
      'lint': 'biome lint',
      'format': 'biome format --write',
      'format:check': 'biome format',
    });
    await ctx.files.copyDir(featureFiles('lint-biome'));
  },
};
