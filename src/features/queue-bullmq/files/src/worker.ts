import { Worker } from 'bullmq';
import { env } from './config/env';
import { bullConnection } from './jobs/connection';
import { EXAMPLE_QUEUE, processExampleJob } from './jobs/example.job';
import { logger } from './lib/logger';

/**
 * The background worker: a separate process from the HTTP server, so slow jobs never hold up
 * requests and each side scales on its own. Run it with `start:worker` (or `dev:worker`).
 */
const workers = [
  new Worker(EXAMPLE_QUEUE, processExampleJob, {
    connection: bullConnection(),
    concurrency: env.WORKER_CONCURRENCY,
  }),
];

for (const worker of workers) {
  worker.on('failed', (job, error) => {
    logger.error({ err: error, jobId: job?.id, queue: worker.name }, 'Job failed');
  });
  worker.on('error', (error) => logger.error({ err: error, queue: worker.name }, 'Worker error'));
}

await Promise.all(workers.map((worker) => worker.waitUntilReady()));
logger.info({ queues: workers.map((worker) => worker.name) }, 'Worker started');

let shuttingDown = false;

/** Let running jobs finish (up to SHUTDOWN_TIMEOUT_MS), then exit. */
async function shutdown(reason: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Worker shutting down');
  const timer = setTimeout(() => {
    logger.error('Jobs did not finish in time, exiting');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  timer.unref();
  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
