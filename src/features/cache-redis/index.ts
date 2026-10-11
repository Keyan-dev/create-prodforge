import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { images, pick } from '../../core/versions';
import { readmeSetup } from '../shared/database';

/**
 * Redis through ioredis: a shared connection in `src/lib/redis.ts` that the server opens before
 * listening and closes on shutdown, a `redis` readiness check, REDIS_URL and a compose service.
 * The bullmq feature builds its queues on top of it.
 */
export const cacheRedis: Feature = {
  id: 'cache-redis',
  label: 'Redis',
  enabled: (cfg) => cfg.cache !== 'none',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('ioredis'));
    await ctx.files.copyDir(featureFiles('cache-redis'));

    ctx.env.add('REDIS_URL', 'redis://localhost:6379', 'Redis connection string');
    ctx.inject('src/config/env.ts', 'env', 'REDIS_URL: z.url({ protocol: /^rediss?$/ }),');
    ctx.compose.addAppEnv('REDIS_URL', 'redis://redis:6379');
    ctx.compose.addVolume('redis-data');
    ctx.compose.addService('redis', {
      image: images.redis,
      ports: ['${REDIS_PORT:-6379}:6379'],
      volumes: ['redis-data:/data'],
      healthcheck: {
        test: ['CMD', 'redis-cli', 'ping'],
        interval: '5s',
        timeout: '3s',
        retries: 10,
      },
    });
    readmeSetup(ctx, 'redis');

    ctx.inject(
      'src/server.ts',
      'imports',
      "import { connectRedis, disconnectRedis } from './lib/redis';",
    );
    ctx.inject(
      'src/server.ts',
      'startup',
      [
        'try {',
        '  await connectRedis();',
        '} catch (error) {',
        "  logger.fatal({ err: error }, 'Could not connect to Redis. Is it running?');",
        '  process.exit(1);',
        '}',
        '',
        '',
      ].join('\n'),
    );
    ctx.inject(
      'src/server.ts',
      'shutdown',
      [
        'try {',
        '  await disconnectRedis();',
        '} catch (closeError) {',
        "  logger.error({ err: closeError }, 'Error while closing Redis');",
        '}',
      ].join('\n'),
    );
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Redis',
        '',
        '`src/lib/redis.ts` exports a shared [ioredis](https://github.com/redis/ioredis) connection, opened before the server listens and closed on shutdown. `/ready` reports it as `redis`. Set `REDIS_URL` to point at your server.',
      ].join('\n'),
    );
  },
};
