import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { hasAuth } from '../shared/auth';
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

    // Auth routes and tests (see the auth-jwt feature).
    if (hasAuth(ctx, 'jwt')) {
      await ctx.files.copyDir(featureFiles('framework-express', 'files-auth-jwt'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { authRouter } from './modules/auth/auth.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.use('/auth', authRouter);");
    }

    // Better Auth's handler, an example protected route and tests (see auth-better-auth).
    if (hasAuth(ctx, 'better-auth')) {
      await ctx.files.copyDir(featureFiles('framework-express', 'files-auth-better-auth'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { toNodeHandler } from 'better-auth/node';\nimport { auth } from './lib/auth';\nimport { authRouter } from './modules/auth/auth.routes';",
      );
      ctx.inject(
        'src/app.ts',
        'before-body',
        "// Better Auth reads the raw body, so it goes before the JSON parser.\napp.all('/api/auth/{*splat}', toNodeHandler(auth));",
      );
      ctx.inject('src/app.ts', 'routes', "app.use('/auth', authRouter);");
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
