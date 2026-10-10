import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** Express 5 app factory (`src/app.ts`), server entry (`src/server.ts`) and a health check test. */
export const frameworkExpress: Feature = {
  id: 'framework-express',
  label: 'Express 5',
  enabled: (cfg) => cfg.framework === 'express',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg
      .addDeps(pick('express'))
      .addDevDeps(pick('@types/express', '@types/supertest', 'supertest'));
    await ctx.files.copyDir(featureFiles('framework-express'));
  },
};
