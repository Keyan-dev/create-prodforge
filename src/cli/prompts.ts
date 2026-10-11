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
  { value: 'otel', label: 'OpenTelemetry', hint: 'traces for HTTP and database calls' },
] as const satisfies { value: keyof ProjectConfigInput; label: string; hint?: string }[];

/**
 * Ask for whatever the flags and preset didn't settle.
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

  if (answers.cache === undefined) {
    answers.cache = unwrap(
      await p.select({
        message: 'Redis',
        initialValue: 'none' as const,
        options: [
          { value: 'none', label: 'None' },
          { value: 'redis', label: 'Redis', hint: 'a shared connection for caching' },
          { value: 'bullmq', label: 'Redis + BullMQ', hint: 'plus background jobs in a worker' },
        ],
      }),
    );
  }
  // Auth stores accounts in the database, so there's nothing to ask without one.
  if (answers.auth === undefined && answers.db !== 'none') {
    answers.auth = unwrap(
      await p.select({
        message: 'Authentication',
        initialValue: 'none' as const,
        options: [
          { value: 'none', label: 'None' },
          { value: 'jwt', label: 'JWT', hint: 'access and refresh tokens' },
          {
            value: 'better-auth',
            label: 'Better Auth',
            hint: 'sessions, cookies and bearer tokens',
          },
        ],
      }),
    );
  }

  // Extras the flags didn't settle, on by default except OpenTelemetry.
  const extras = EXTRAS.filter(({ value }) => answers[value] === undefined);
  if (extras.length) {
    const chosen = unwrap(
      await p.multiselect({
        message: 'Extras',
        options: extras,
        initialValues: extras.map(({ value }) => value).filter((value) => value !== 'otel'),
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
