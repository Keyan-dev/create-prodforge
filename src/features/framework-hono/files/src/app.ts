import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
import { env } from './config/env';
import { type AppEnv, createRouter } from './lib/hono';
import { errorHandler, notFound } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRoutes } from './modules/health/health.routes';
// @slot:imports

/** Build the app without listening, so tests can drive it with `app.request()`. */
export function createApp() {
  const app = createRouter();

  // Reuses an incoming X-Request-Id (from a proxy) or creates one, and echoes it back.
  app.use(requestId());
  app.use(requestLogger);
  app.use(secureHeaders());
  // Health checks stay outside CORS and rate limiting.
  app.route('/', healthRoutes);

  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',') }));
  app.use(
    rateLimiter<AppEnv>({
      windowMs: 60_000,
      limit: env.RATE_LIMIT_PER_MINUTE,
      standardHeaders: 'draft-7',
      // c.env is the Node request under @hono/node-server; app.request() in tests has none.
      keyGenerator: (c) =>
        (c.env as AppEnv['Bindings'] | undefined)?.incoming.socket.remoteAddress ?? 'unknown',
    }),
  );
  app.use(
    bodyLimit({
      maxSize: env.BODY_LIMIT_KB * 1024,
      onError: () => {
        throw new HTTPException(413, { message: 'Request body too large' });
      },
    }),
  );
  // @slot:middleware

  // @slot:routes
  app.notFound(notFound);
  app.onError(errorHandler);

  return app;
}
