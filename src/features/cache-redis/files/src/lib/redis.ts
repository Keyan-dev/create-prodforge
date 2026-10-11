import { Redis } from 'ioredis';
import { env } from '../config/env';
import { addReadinessCheck } from './readiness';

/**
 * The app's shared Redis connection (ioredis). It connects in `connectRedis()`, not on import,
 * so tests can import modules that use it without a Redis server.
 */
export const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 3 });

/** Called once at startup: connect (failing fast if Redis can't be reached), then report it in /ready. */
export async function connectRedis() {
  await redis.connect();
  addReadinessCheck('redis', async () => {
    await redis.ping();
  });
}

export async function disconnectRedis() {
  await redis.quit();
}
