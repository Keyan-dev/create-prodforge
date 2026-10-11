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
  if (answers.install === undefined) {
    answers.install = unwrap(await p.confirm({ message: 'Install dependencies?' }));
  }
  if (answers.git === undefined) {
    answers.git = unwrap(await p.confirm({ message: 'Initialize git?' }));
  }
  return answers;
}
