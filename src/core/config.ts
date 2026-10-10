import { z } from 'zod';

/** npm package name rules, minus legacy exceptions (no uppercase, no leading dot or underscore). */
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * The single source of truth for what gets generated. Prompts, flags and presets all produce one
 * of these. Defaults match the `api` preset, which is what `--yes` uses (docs/decisions.md).
 */
export const ProjectConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(214)
    .regex(PACKAGE_NAME, 'must be a valid npm package name (lowercase, no spaces)'),
  node: z.enum(['22', '24']).default('24'),
  packageManager: z.enum(['pnpm', 'npm', 'yarn', 'bun']).default('pnpm'),
  framework: z.enum(['express', 'fastify', 'hono']).default('express'),
  db: z.enum(['none', 'prisma', 'drizzle', 'mongoose']).default('prisma'),
  /** Example `users` CRUD module. Defaults to on only when a database is selected. */
  example: z.boolean().optional(),
  cache: z.enum(['none', 'redis', 'bullmq']).default('none'),
  auth: z.enum(['none', 'jwt', 'better-auth']).default('none'),
  lint: z.enum(['eslint', 'biome']).default('eslint'),
  openapi: z.boolean().default(true),
  otel: z.boolean().default(false),
  docker: z.boolean().default(true),
  pm2: z.boolean().default(true),
  ci: z.boolean().default(true),
  gitHooks: z.boolean().default(true),
  install: z.boolean().default(true),
  git: z.boolean().default(true),
});

export type ProjectConfigInput = z.input<typeof ProjectConfigSchema>;
export type ProjectConfig = Omit<z.output<typeof ProjectConfigSchema>, 'example'> & {
  example: boolean;
};

/** Validate raw input and fill in defaults. Throws a `ZodError` with every problem at once. */
export function parseConfig(input: ProjectConfigInput): ProjectConfig {
  const parsed = ProjectConfigSchema.parse(input);
  return { ...parsed, example: parsed.example ?? parsed.db !== 'none' };
}
