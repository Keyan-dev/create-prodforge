import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { hasAuth } from '../shared/auth';
import { addHttpEnv, hasUsersExample } from '../shared/http';

/**
 * Hono on Node (@hono/node-server): `createApp()` factory with request IDs and Pino request
 * logs, secure headers, CORS, rate limiting, body limits, health/readiness routes and a central
 * error handler; `server.ts` with graceful shutdown; tests through `app.request()`.
 */
export const frameworkHono: Feature = {
  id: 'framework-hono',
  label: 'Hono',
  enabled: (cfg) => cfg.framework === 'hono',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('@hono/node-server', 'hono', 'hono-rate-limiter'));
    addHttpEnv(ctx);

    await ctx.files.copyDir(featureFiles('framework-hono'));

    // /openapi.json and the Scalar docs page (see the openapi feature).
    if (ctx.cfg.openapi) {
      ctx.pkg.addDeps(pick('@scalar/hono-api-reference'));
      await ctx.files.copyDir(featureFiles('framework-hono', 'files-openapi'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { docsRoutes } from './modules/docs/docs.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.route('/', docsRoutes);");
    }

    // Auth routes and tests (see the auth-jwt feature).
    if (hasAuth(ctx, 'jwt')) {
      await ctx.files.copyDir(featureFiles('framework-hono', 'files-auth-jwt'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { authRoutes } from './modules/auth/auth.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.route('/auth', authRoutes);");
    }

    // Better Auth's handler, an example protected route and tests (see auth-better-auth).
    if (hasAuth(ctx, 'better-auth')) {
      await ctx.files.copyDir(featureFiles('framework-hono', 'files-auth-better-auth'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { authRoutes, betterAuthRoutes } from './modules/auth/auth.routes';",
      );
      ctx.inject(
        'src/app.ts',
        'routes',
        "app.route('/', betterAuthRoutes);\napp.route('/auth', authRoutes);",
      );
    }

    // Routes and tests for the example users module (see the example-users feature).
    if (hasUsersExample(ctx)) {
      await ctx.files.copyDir(featureFiles('framework-hono', 'files-example'));
      ctx.inject(
        'src/app.ts',
        'imports',
        "import { usersRoutes } from './modules/users/users.routes';",
      );
      ctx.inject('src/app.ts', 'routes', "app.route('/users', usersRoutes);");
    }
  },
};
