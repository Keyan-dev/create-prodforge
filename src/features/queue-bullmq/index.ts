import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { runScript } from '../shared/database';

/**
 * Background jobs with BullMQ on the Redis from cache-redis: an example job (processor plus an
 * enqueue helper), a separate worker entry point `src/worker.ts` with graceful shutdown, its
 * scripts, a compose `worker` service and a PM2 app.
 */
export const queueBullmq: Feature = {
  id: 'queue-bullmq',
  label: 'BullMQ',
  enabled: (cfg) => cfg.cache === 'bullmq',
  dependsOn: ['base', 'cache-redis'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('bullmq')).addScripts({
      'dev:worker': 'tsx watch --env-file-if-exists=.env src/worker.ts',
      'start:worker': 'node --env-file-if-exists=.env dist/worker.js',
    });
    await ctx.files.copyDir(featureFiles('queue-bullmq'));

    ctx.env.add('WORKER_CONCURRENCY', '5', 'Jobs each worker process runs at once');
    ctx.inject(
      'src/config/env.ts',
      'env',
      'WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),',
    );
    ctx.inject('tsdown.config.ts', 'entries', "'src/worker.ts',");
    // The server enqueues jobs, so it closes its queue connection on shutdown.
    ctx.inject(
      'src/server.ts',
      'imports',
      "import { closeExampleQueue } from './jobs/example.job';",
    );
    ctx.inject('src/server.ts', 'shutdown', 'await closeExampleQueue();');

    ctx.compose.addAppProcess('worker', ['node', 'dist/worker.js']);
    ctx.inject(
      'ecosystem.config.cjs',
      'apps',
      [
        '{',
        `  name: '${ctx.cfg.name}-worker',`,
        "  script: 'dist/worker.js',",
        "  node_args: '--env-file-if-exists=.env',",
        '  instances: 1,',
        '  kill_timeout: 15_000,',
        '  env,',
        '},',
      ].join('\n'),
      { optional: true },
    );

    const run = runScript(ctx.cfg);
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Background jobs',
        '',
        `Jobs run in a separate worker process with [BullMQ](https://docs.bullmq.io) on Redis. \`src/jobs/example.job.ts\` shows the pattern: call \`enqueueExampleJob()\` from the app, and the worker (\`src/worker.ts\`) runs \`processExampleJob()\`. Start the worker with \`${run} dev:worker\` in development and \`${run} start:worker\` after a build. Docker Compose runs it as the \`worker\` service.`,
      ].join('\n'),
    );
  },
};
