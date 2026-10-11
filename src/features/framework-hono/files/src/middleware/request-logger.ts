import type { MiddlewareHandler } from 'hono';
import { logger } from '../lib/logger';
import type { AppEnv } from '../lib/hono';

const QUIET_PATHS = new Set(['/health', '/ready']);

/** A child logger tagged with the request id as `c.get('log')`, and one line per request. */
export const requestLogger: MiddlewareHandler<AppEnv> = async (c, next) => {
  const log = logger.child({ reqId: c.get('requestId') });
  c.set('log', log);
  const start = performance.now();
  await next();
  if (QUIET_PATHS.has(c.req.path)) return;
  log.info(
    {
      req: { method: c.req.method, url: c.req.path },
      res: { statusCode: c.res.status },
      responseTime: Math.round(performance.now() - start),
    },
    'request completed',
  );
};
