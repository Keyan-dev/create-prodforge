import type { ProjectConfig } from '../core/config';
import { dockerSupports } from '../features/docker';

/**
 * Options the config schema accepts but no feature implements yet. This list shrinks as each
 * PLAN.md phase lands, and goes away once every option has a feature.
 */
export function unavailable(cfg: ProjectConfig): { blocking: string[]; skipped: string[] } {
  const blocking: string[] = [];

  const skipped = [
    cfg.example && cfg.db === 'none' && 'example module (it needs a database)',
    cfg.auth !== 'none' && `auth (${cfg.auth})`,
    cfg.docker && !dockerSupports(cfg.packageManager) && `Docker (with ${cfg.packageManager})`,
  ].filter((item): item is string => Boolean(item));

  return { blocking, skipped };
}
