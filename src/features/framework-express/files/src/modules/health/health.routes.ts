import { Router } from 'express';
import { readiness } from '../../lib/readiness';

export const healthRouter = Router();

/** Liveness: the process is up. Used by the Docker HEALTHCHECK. */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

/** Readiness: dependencies are reachable and the app isn't shutting down. */
healthRouter.get('/ready', async (_req, res) => {
  const result = await readiness();
  res.status(result.ready ? 200 : 503).json(result);
});
