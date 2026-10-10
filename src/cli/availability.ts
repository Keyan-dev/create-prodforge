import type { ProjectConfig } from '../core/config';

/**
 * Options the config schema accepts but no feature implements yet. This list shrinks as each
 * PLAN.md phase lands, and goes away once every option has a feature.
 */
export function unavailable(cfg: ProjectConfig): { blocking: string[]; skipped: string[] } {
  const blocking = [
    cfg.framework !== 'express' && `framework "${cfg.framework}"`,
    cfg.lint !== 'eslint' && `linter "${cfg.lint}"`,
  ].filter((item): item is string => Boolean(item));

  const skipped = [
    cfg.db !== 'none' && `database (${cfg.db})`,
    cfg.example && 'example module',
    cfg.cache !== 'none' && `cache (${cfg.cache})`,
    cfg.auth !== 'none' && `auth (${cfg.auth})`,
    cfg.openapi && 'OpenAPI',
    cfg.otel && 'OpenTelemetry',
    cfg.docker && 'Docker',
    cfg.pm2 && 'PM2',
    cfg.ci && 'CI workflow',
    cfg.gitHooks && 'git hooks',
  ].filter((item): item is string => Boolean(item));

  return { blocking, skipped };
}
