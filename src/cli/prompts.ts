import * as p from '@clack/prompts';
import type { ProjectConfigInput } from '../core/config';
import { ProjectConfigSchema } from '../core/config';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
  }
}

function unwrap<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) throw new CancelledError();
  return value as Exclude<T, symbol>;
}

const EXTRAS = [
  { value: 'openapi', label: 'OpenAPI docs', hint: '/openapi.json and a Scalar page at /docs' },
  { value: 'docker', label: 'Docker', hint: 'Dockerfile and compose.yaml' },
  { value: 'pm2', label: 'PM2', hint: 'cluster mode config' },
  { value: 'ci', label: 'GitHub Actions CI' },
  { value: 'gitHooks', label: 'Git hooks', hint: 'Husky, lint-staged, commitlint' },
] as const satisfies { value: keyof ProjectConfigInput; label: string; hint?: string }[];

/**
 * Ask for whatever the flags didn't settle. Only options that a feature implements today are
 * asked about; the rest keep their defaults (see availability.ts).
 */
export async function promptForMissing(
  given: Partial<ProjectConfigInput>,
): Promise<Partial<ProjectConfigInput>> {
  const answers: Partial<ProjectConfigInput> = { ...given };

  if (answers.name === undefined) {
    answers.name = unwrap(
      await p.text({
        message: 'Project name',
        placeholder: 'my-api',
        defaultValue: 'my-api',
        validate: (value) => {
          if (!value) return undefined;
          const result = ProjectConfigSchema.shape.name.safeParse(value);
          return result.success ? undefined : result.error.issues[0]?.message;
        },
      }),
    );
  }
  if (answers.framework === undefined) {
    answers.framework = unwrap(
      await p.select({
        message: 'Framework',
        initialValue: 'express' as const,
        options: [
          { value: 'express', label: 'Express', hint: 'recommended' },
          { value: 'fastify', label: 'Fastify' },
          { value: 'hono', label: 'Hono' },
        ],
      }),
    );
  }
  if (answers.db === undefined) {
    answers.db = unwrap(
      await p.select({
        message: 'Database',
        initialValue: 'prisma' as const,
        options: [
          { value: 'prisma', label: 'Prisma + PostgreSQL', hint: 'recommended' },
          { value: 'drizzle', label: 'Drizzle + PostgreSQL' },
          { value: 'mongoose', label: 'Mongoose + MongoDB' },
          { value: 'none', label: 'None' },
        ],
      }),
    );
  }
  if (answers.lint === undefined) {
    answers.lint = unwrap(
      await p.select({
        message: 'Linter and formatter',
        initialValue: 'eslint' as const,
        options: [
          { value: 'eslint', label: 'ESLint + Prettier', hint: 'recommended' },
          { value: 'biome', label: 'Biome' },
        ],
      }),
    );
  }

  // Extras the flags didn't settle, all on by default.
  const extras = EXTRAS.filter(({ value }) => answers[value] === undefined);
  if (extras.length) {
    const chosen = unwrap(
      await p.multiselect({
        message: 'Extras',
        options: extras,
        initialValues: extras.map(({ value }) => value),
        required: false,
      }),
    );
    for (const { value } of extras) answers[value] = chosen.includes(value);
  }

  if (answers.install === undefined) {
    answers.install = unwrap(await p.confirm({ message: 'Install dependencies?' }));
  }
  if (answers.git === undefined) {
    answers.git = unwrap(await p.confirm({ message: 'Initialize git?' }));
  }
  return answers;
}
