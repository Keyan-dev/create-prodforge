import type { ConnectionOptions } from 'bullmq';
import { env } from '../config/env';

/**
 * Connection settings for BullMQ. Each queue and worker opens its own Redis connection from
 * these; workers need `maxRetriesPerRequest: null` because they block waiting for jobs.
 */
export function bullConnection(): ConnectionOptions {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    ...(url.username && { username: decodeURIComponent(url.username) }),
    ...(url.password && { password: decodeURIComponent(url.password) }),
    ...(url.protocol === 'rediss:' && { tls: {} }),
    maxRetriesPerRequest: null,
  };
}
