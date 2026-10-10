import { pino } from 'pino';
import { env } from '../config/env';

const defaultLevel = { development: 'debug', test: 'silent', production: 'info' } as const;

/** Pretty output in development, JSON lines everywhere else. */
export const logger = pino({
  level: env.LOG_LEVEL ?? defaultLevel[env.NODE_ENV],
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
  ...(env.NODE_ENV === 'development' && { transport: { target: 'pino-pretty' } }),
});
