import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFound } from './middleware/error-handler';
import { healthRouter } from './modules/health/health.routes';
// @slot:imports

/** Build the app without listening, so tests can drive it directly. */
export function createApp() {
  const app = express();

  app.use(
    pinoHttp({
      logger,
      // Reuse an incoming X-Request-Id (from a proxy) or create one, and echo it back.
      genReqId: (req, res) => {
        const id = req.headers['x-request-id']?.toString() || randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/ready' },
    }),
  );
  app.use(helmet());
  // Health checks stay outside CORS and rate limiting.
  app.use(healthRouter);

  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',') }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: env.RATE_LIMIT_PER_MINUTE,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  app.use(express.json({ limit: env.BODY_LIMIT_KB * 1024 }));
  // @slot:middleware

  // @slot:routes
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
