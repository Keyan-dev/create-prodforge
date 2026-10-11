import { serve } from '@hono/node-server';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { markShuttingDown } from './lib/readiness';
// @slot:imports

// @slot:startup
const server = serve({ fetch: createApp().fetch, port: env.PORT }, () => {
  logger.info(`Listening on http://localhost:${env.PORT}`);
  // Tells PM2 (wait_ready) that this worker can take traffic.
  process.send?.('ready');
});

let shuttingDown = false;

/** Stop taking new connections, let open requests finish, close resources, then exit. */
function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ reason }, 'Shutting down');
  markShuttingDown();

  const timer = setTimeout(() => {
    logger.error('Open connections did not close in time, exiting');
    process.exit(1);
  }, env.SHUTDOWN_TIMEOUT_MS);
  timer.unref();

  server.close(async (error) => {
    // @slot:shutdown
    if (error) logger.error({ err: error }, 'Error while closing the server');
    process.exit(error ? 1 : exitCode);
  });
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  shutdown('unhandledRejection', 1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  shutdown('uncaughtException', 1);
});
