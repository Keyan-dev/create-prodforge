import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { addHttpEnv, hasUsersExample } from '../shared/http';

/**
 * Express 5 app: `createApp()` factory with request logging and IDs, helmet, CORS, rate
 * limiting, body limits, health/readiness routes and a central error handler; `server.ts` with
 * graceful shutdown; Supertest tests.
 */
export const frameworkExpress: Feature = {
  id: 'framework-express',
  label: 'Express 5',
  enabled: (cfg) => cfg.framework === 'express',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg
      .addDeps(pick('cors', 'express', 'express-rate-limit', 'helmet', 'pino-http'))
      .addDevDeps(pick('@types/cors', '@types/express', '@types/supertest', 'supertest'));

    addHttpEnv(ctx);

    await ctx.files.copyDir(featureFiles('framework-express'));

    // /openapi.json and the Scalar docs page (see the openapi feature).
    if (ctx.cfg.openapi) {
      ctx.pkg.addDeps(pick('@scalar/express-api-reference'));
      await ctx.files.copyDir(featureFiles('framework-express', 'files-openapi'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { docsRouter } from './modules/docs/docs.routes';",
      );
      ctx.inject('src/app.ts', 'routes', 'app.use(docsRouter);');
    }

    // Routes and tests for the example users module (see the example-users feature).
    if (hasUsersExample(ctx)) {
      await ctx.files.copyDir(featureFiles('framework-express', 'files-example'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { usersRouter } from './modules/users/users.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.use('/users', usersRouter);");
    }
  },
};
