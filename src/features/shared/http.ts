import type { GeneratorContext } from '../../core/context';

/**
 * Settings every framework feature reads the same way: CORS origins, the rate limit and the
 * request body limit. Only one framework is enabled per project, so they are added once.
 */
export function addHttpEnv(ctx: GeneratorContext): void {
  ctx.env.add('CORS_ORIGIN', '*', 'Allowed CORS origins, comma-separated, or * for any');
  ctx.env.add('RATE_LIMIT_PER_MINUTE', '100', 'Requests per minute per client IP');
  ctx.env.add('BODY_LIMIT_KB', '100', 'Largest accepted request body, in kilobytes');
  ctx.inject(
    'src/config/env.ts',
    'env',
    [
      "CORS_ORIGIN: z.string().default('*'),",
      'RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(100),',
      'BODY_LIMIT_KB: z.coerce.number().int().positive().default(100),',
    ].join('\n'),
  );
}

/** Whether the example users module is generated (it needs a database). */
export function hasUsersExample(ctx: GeneratorContext): boolean {
  return ctx.cfg.example && ctx.cfg.db !== 'none';
}
