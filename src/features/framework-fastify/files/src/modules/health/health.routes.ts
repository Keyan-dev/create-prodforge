import type { FastifyPluginAsync } from 'fastify';
import { readiness } from '../../lib/readiness';

// Probes are frequent: keep them out of the logs and the rate limit.
const probe = { logLevel: 'silent', config: { rateLimit: false } } as const;

export const healthRoutes: FastifyPluginAsync = async (app) => {
  /** Liveness: the process is up. Used by the Docker HEALTHCHECK. */
  app.get('/health', probe, async () => ({ status: 'ok' }));

  /** Readiness: dependencies are reachable and the app isn't shutting down. */
  app.get('/ready', probe, async (_request, reply) => {
    const result = await readiness();
    return reply.status(result.ready ? 200 : 503).send(result);
  });
};
