import type { ProjectConfig } from './config';
import type { GeneratorContext } from './context';

/**
 * One self-contained piece of a generated project (Docker, PM2, Prisma, …). Features never
 * import each other; they cooperate only through the `GeneratorContext`.
 */
export interface Feature {
  /** Unique id, matching the folder name under `src/features/`. */
  id: string;
  label: string;
  /** Whether this feature applies to the given config. */
  enabled(cfg: ProjectConfig): boolean;
  /**
   * Feature ids that must run before this one when they are enabled. Ordering only: a disabled
   * dependency is skipped, but an id that no registered feature has is an error (likely a typo).
   */
  dependsOn?: string[];
  /** Feature ids that can't be enabled together with this one. */
  conflictsWith?: string[];
  /** Contribute files, dependencies, env vars, compose services and slot injections. */
  apply(ctx: GeneratorContext): void | Promise<void>;
  /**
   * Runs after every feature's `apply()`, in the same order. Use it to consume what other
   * features registered, e.g. the docker feature reading `ctx.compose` to write compose.yaml.
   */
  finalize?(ctx: GeneratorContext): void | Promise<void>;
}
