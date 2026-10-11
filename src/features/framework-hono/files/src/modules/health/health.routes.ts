import { createRouter } from '../../lib/hono';
import { readiness } from '../../lib/readiness';

export const healthRoutes = createRouter()
  /** Liveness: the process is up. Used by the Docker HEALTHCHECK. */
  .get('/health', (c) => c.json({ status: 'ok' }))
  /** Readiness: dependencies are reachable and the app isn't shutting down. */
  .get('/ready', async (c) => {
    const result = await readiness();
    return c.json(result, result.ready ? 200 : 503);
  });
