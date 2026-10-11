import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ProjectConfigSchema, type ProjectConfigInput } from './config';

export type PresetName = 'minimal' | 'api' | 'full';
export type Preset = Omit<Partial<ProjectConfigInput>, 'name' | 'install' | 'git'>;

/**
 * Built-in presets (docs/decisions.md). `api` is the schema defaults, which `--yes` also uses.
 * Flags always win over a preset, and prompts only ask what neither settled. `api` and `full`
 * leave `example` unset so it follows the database, as it does without a preset.
 */
export const presets: Record<PresetName, Preset> = {
  minimal: {
    framework: 'express',
    db: 'none',
    example: false,
    openapi: false,
    docker: true,
    pm2: false,
    ci: false,
    gitHooks: false,
  },
  api: {
    framework: 'express',
    db: 'prisma',
    openapi: true,
    docker: true,
    pm2: true,
    ci: true,
    gitHooks: true,
  },
  full: {
    framework: 'express',
    db: 'prisma',
    openapi: true,
    docker: true,
    pm2: true,
    ci: true,
    gitHooks: true,
    cache: 'bullmq',
    auth: 'better-auth',
    otel: true,
  },
};

/**
 * What a preset file may contain: any config field except the project name and the
 * install/git steps, which belong to each run. Unknown keys are an error, to catch typos.
 * `$schema` is allowed so editors can validate the file.
 */
export const PresetSchema = ProjectConfigSchema.omit({ name: true, install: true, git: true })
  .partial()
  .extend({ $schema: z.string().optional() })
  .strict();

function isPresetName(value: string): value is PresetName {
  return Object.hasOwn(presets, value);
}

/** A built-in preset by name, or a JSON file by path (relative to `cwd`). */
export async function loadPreset(value: string, cwd: string): Promise<Preset> {
  if (isPresetName(value)) return presets[value];
  if (!/[/\\]|\.json$/.test(value)) {
    throw new Error(
      `Unknown preset "${value}". Use ${Object.keys(presets).join(', ')}, or a path to a JSON file.`,
    );
  }

  const path = resolve(cwd, value);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Couldn't read preset ${value}: ${reason}`, { cause: error });
  }
  const parsed = PresetSchema.parse(raw);
  // Parsing fills in defaults; keep only what the file sets, so prompts still ask the rest.
  const given = new Set(Object.keys(raw as object));
  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => given.has(key) && key !== '$schema'),
  ) as Preset;
}
