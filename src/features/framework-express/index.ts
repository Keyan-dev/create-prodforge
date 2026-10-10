import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

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

    ctx.env.add('CORS_ORIGIN', '*', 'Allowed CORS origins, comma-separated, or * for any');
    ctx.env.add('RATE_LIMIT_PER_MINUTE', '100', 'Requests per minute per client IP');
    ctx.env.add('BODY_LIMIT', '100kb', 'Largest accepted JSON request body');
    ctx.inject(
      'src/config/env.ts',
      'env',
      [
        "CORS_ORIGIN: z.string().default('*'),",
        'RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),',
        "BODY_LIMIT: z.string().default('100kb'),",
      ].join('\n'),
    );

    await ctx.files.copyDir(featureFiles('framework-express'));
  },
};
