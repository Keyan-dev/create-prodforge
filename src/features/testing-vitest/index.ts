import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** Vitest with v8 coverage. Framework features supply the actual tests. */
export const testingVitest: Feature = {
  id: 'testing-vitest',
  label: 'Vitest',
  enabled: () => true,
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDevDeps(pick('vitest', '@vitest/coverage-v8')).addScripts({
      'test': 'vitest run',
      'test:watch': 'vitest',
      'test:coverage': 'vitest run --coverage',
    });
    await ctx.files.copyDir(featureFiles('testing-vitest'));
  },
};
