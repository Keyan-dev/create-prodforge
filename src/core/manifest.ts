import { z } from 'zod';
import { ProjectConfigSchema, type ProjectConfig } from './config';

/** Written to the root of every generated project so `create-prodforge add` can re-run it. */
export const MANIFEST_FILE = '.prodforge.json';

export const ManifestSchema = z.object({
  /** create-prodforge version that generated (or last updated) the project. */
  version: z.string(),
  /** The options the project was generated with. */
  config: ProjectConfigSchema.omit({ install: true, git: true }).extend({
    example: z.boolean(),
  }),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export function manifestFor(cfg: ProjectConfig, version: string): string {
  const config = Object.fromEntries(
    Object.entries(cfg).filter(([key]) => key !== 'install' && key !== 'git'),
  ) as Manifest['config'];
  const manifest: Manifest = { version, config };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
