import { readdir } from 'node:fs/promises';
import type { ProjectConfig } from './config';
import { GeneratorContext } from './context';
import type { Feature } from './feature';
import { normalizePath } from './paths';
import { applySlots, findSlots } from './slots';
import type { VirtualFS } from './vfs';

/**
 * Pick the enabled features and order them so every feature runs after its enabled
 * `dependsOn` entries. Ties keep registry order, so output is deterministic.
 */
export function resolveFeatures(registry: readonly Feature[], cfg: ProjectConfig): Feature[] {
  const ids = new Set<string>();
  for (const feature of registry) {
    if (ids.has(feature.id)) throw new Error(`Duplicate feature id "${feature.id}"`);
    ids.add(feature.id);
  }
  for (const feature of registry) {
    for (const id of [...(feature.dependsOn ?? []), ...(feature.conflictsWith ?? [])]) {
      if (!ids.has(id))
        throw new Error(`Feature "${feature.id}" refers to unknown feature "${id}"`);
    }
  }

  const enabled = registry.filter((feature) => feature.enabled(cfg));
  const enabledIds = new Set(enabled.map((feature) => feature.id));

  for (const feature of enabled) {
    const clash = feature.conflictsWith?.find((id) => enabledIds.has(id));
    if (clash) throw new Error(`Features "${feature.id}" and "${clash}" can't be used together`);
  }

  // Kahn's algorithm, always taking the earliest ready feature in registry order.
  const pending = new Map(
    enabled.map((feature) => [
      feature.id,
      new Set((feature.dependsOn ?? []).filter((id) => enabledIds.has(id))),
    ]),
  );
  const ordered: Feature[] = [];
  while (pending.size) {
    const next = enabled.find((feature) => pending.get(feature.id)?.size === 0);
    if (!next) {
      throw new Error(`Feature dependency cycle among: ${[...pending.keys()].join(', ')}`);
    }
    ordered.push(next);
    pending.delete(next.id);
    for (const deps of pending.values()) deps.delete(next.id);
  }
  return ordered;
}

export interface GenerateResult {
  files: VirtualFS;
  /** Ids of the features that ran, in order. */
  features: string[];
}

/**
 * Run the features against an in-memory project: apply → finalize → slot injection →
 * package.json and .env.example. Nothing is written to disk.
 */
export async function generate(
  cfg: ProjectConfig,
  registry: readonly Feature[],
): Promise<GenerateResult> {
  const features = resolveFeatures(registry, cfg);
  const ctx = new GeneratorContext(cfg);

  for (const feature of features) await feature.apply(ctx);
  for (const feature of features) await feature.finalize?.(ctx);

  const injections = ctx.injections.filter(
    (injection) => !injection.optional || ctx.vfs.has(normalizePath(injection.path)),
  );
  const byFile = Map.groupBy(injections, (injection) => normalizePath(injection.path));
  for (const [path, injections] of byFile) {
    if (!ctx.vfs.has(path)) throw new Error(`Can't inject into ${path}: no feature wrote it`);
    ctx.vfs.write(path, applySlots(path, ctx.vfs.read(path), injections));
  }
  // Files nobody injected into still carry their markers.
  for (const path of ctx.vfs.paths()) {
    const content = ctx.vfs.read(path);
    if (!byFile.has(path) && findSlots(content).length) {
      ctx.vfs.write(path, applySlots(path, content, []));
    }
  }

  ctx.vfs.write('package.json', ctx.pkg.toString());
  const env = ctx.env.toString();
  if (env) ctx.vfs.write('.env.example', env);

  return { files: ctx.vfs, features: features.map((feature) => feature.id) };
}

/** Flush a generated project to disk. Refuses a non-empty directory unless `force` is set. */
export async function writeProject(
  files: VirtualFS,
  targetDir: string,
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  if (!force) {
    const existing = await readdir(targetDir).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    if (existing.length) {
      throw new Error(`${targetDir} is not empty. Use --force to write into it anyway.`);
    }
  }
  await files.flush(targetDir);
}
