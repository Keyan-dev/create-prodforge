import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { addHttpEnv, hasUsersExample } from '../shared/http';

/**
 * Fastify 5 app: `createApp()` factory using the shared Pino logger with request IDs, helmet,
 * CORS, rate limiting, body limits, health/readiness routes and a central error handler;
 * `server.ts` with graceful shutdown; tests through `app.inject()`.
 */
export const frameworkFastify: Feature = {
  id: 'framework-fastify',
  label: 'Fastify 5',
  enabled: (cfg) => cfg.framework === 'fastify',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('@fastify/cors', '@fastify/helmet', '@fastify/rate-limit', 'fastify'));
    addHttpEnv(ctx);

    await ctx.files.copyDir(featureFiles('framework-fastify'));

    // /openapi.json and the Scalar docs page (see the openapi feature).
    if (ctx.cfg.openapi) {
      ctx.pkg.addDeps(pick('@scalar/fastify-api-reference'));
      await ctx.files.copyDir(featureFiles('framework-fastify', 'files-openapi'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { docsRoutes } from './modules/docs/docs.routes';",
      );
      ctx.inject('src/app.ts', 'routes', 'app.register(docsRoutes);');
    }

    // Routes and tests for the example users module (see the example-users feature).
    if (hasUsersExample(ctx)) {
      await ctx.files.copyDir(featureFiles('framework-fastify', 'files-example'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { usersRoutes } from './modules/users/users.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.register(usersRoutes, { prefix: '/users' });");
    }
  },
};
