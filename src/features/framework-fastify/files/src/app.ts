import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFound } from './middleware/error-handler';
import { healthRoutes } from './modules/health/health.routes';
// @slot:imports

/** Build the app without listening, so tests can drive it with `app.inject()`. */
export function createApp() {
  const app = Fastify({
    loggerInstance: logger,
    // Reuse an incoming X-Request-Id (from a proxy) or create one; it's echoed back below.
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
    bodyLimit: env.BODY_LIMIT_KB * 1024,
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  app.register(helmet);
  app.register(cors, { origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',') });
  app.register(rateLimit, { max: env.RATE_LIMIT_PER_MINUTE, timeWindow: '1 minute' });
  // @slot:middleware

  app.register(healthRoutes);
  // @slot:routes
  app.setNotFoundHandler(notFound);
  app.setErrorHandler(errorHandler);

  return app;
}
