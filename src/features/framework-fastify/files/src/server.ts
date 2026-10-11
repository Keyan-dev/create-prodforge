import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { markShuttingDown } from './lib/readiness';
// @slot:imports

// @slot:startup
const app = createApp();
// 0.0.0.0 so the server is reachable from outside a container; Fastify defaults to localhost.
await app.listen({ port: env.PORT, host: '0.0.0.0' });
// Tells PM2 (wait_ready) that this worker can take traffic.
process.send?.('ready');

let shuttingDown = false;

/** Stop taking new connections, let open requests finish, close resources, then exit. */
async function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');
  markShuttingDown();

  const timer = setTimeout(() => {
    logger.error('Open connections did not close in time, exiting');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  let failed = false;
  try {
    await app.close();
  } catch (error) {
    failed = true;
    logger.error({ err: error }, 'Error while closing the server');
  }
  // @slot:shutdown
  process.exit(failed ? 1 : exitCode);
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  void shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  void shutdown('uncaughtException', 1);
});
