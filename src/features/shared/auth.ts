import type { GeneratorContext } from '../../core/context';

/** Auth needs a database to store accounts, so it is only generated with one. */
export function hasAuth(ctx: GeneratorContext, kind: 'jwt' | 'better-auth'): boolean {
  return ctx.cfg.auth === kind && ctx.cfg.db !== 'none';
}
