import type { ArgsDef } from 'citty';
import { ProjectConfigSchema, type ProjectConfigInput } from '../core/config';

const shape = ProjectConfigSchema.shape;
const options = <T extends { unwrap(): { options: readonly string[] } }>(field: T) => [
  ...field.unwrap().options,
];

/** Every flag mirrors a prompt or a config field (PLAN.md §3). */
export const args = {
  'name': { type: 'positional', required: false, description: 'Project name and directory' },
  'yes': { type: 'boolean', alias: 'y', description: 'Skip prompts and use the defaults' },
  'force': { type: 'boolean', description: 'Write into a non-empty directory' },
  'preset': {
    type: 'string',
    description: 'minimal, api or full, or a path to a JSON preset file. Flags override it.',
  },
  'dry-run': {
    type: 'boolean',
    description: 'Print the files and package.json that would be generated, without writing',
  },
  'latest': {
    type: 'boolean',
    description: 'Use the latest npm versions instead of the tested pins (not verified)',
  },
  'framework': { type: 'enum', options: options(shape.framework), description: 'Web framework' },
  'db': { type: 'enum', options: options(shape.db), description: 'Database / ORM' },
  'pm': { type: 'enum', options: options(shape.packageManager), description: 'Package manager' },
  'node': { type: 'enum', options: options(shape.node), description: 'Node.js major version' },
  'lint': { type: 'enum', options: options(shape.lint), description: 'Linter' },
  'cache': { type: 'enum', options: options(shape.cache), description: 'Cache / queue' },
  'auth': { type: 'enum', options: options(shape.auth), description: 'Authentication' },
  'install': {
    type: 'boolean',
    description: 'Install dependencies',
    negativeDescription: "Don't install dependencies",
  },
  'git': {
    type: 'boolean',
    description: 'Initialize a git repository',
    negativeDescription: "Don't run git init",
  },
  'docker': { type: 'boolean', description: 'Dockerfile and compose.yaml' },
  'pm2': { type: 'boolean', description: 'PM2 ecosystem file' },
  'ci': { type: 'boolean', description: 'GitHub Actions workflow' },
  'git-hooks': { type: 'boolean', description: 'Husky, lint-staged and commitlint' },
  'openapi': { type: 'boolean', description: 'OpenAPI docs with Scalar' },
  'otel': { type: 'boolean', description: 'OpenTelemetry' },
  'example': { type: 'boolean', description: 'Example users CRUD module' },
} as const satisfies ArgsDef;

type ParsedArgs = Record<string, unknown>;

/** Config fields set explicitly on the command line. Unset flags stay out so defaults apply. */
export function argsToConfig(parsed: ParsedArgs): Partial<ProjectConfigInput> {
  const fields: Record<string, unknown> = {
    name: parsed.name,
    framework: parsed.framework,
    db: parsed.db,
    packageManager: parsed.pm,
    node: parsed.node,
    lint: parsed.lint,
    cache: parsed.cache,
    auth: parsed.auth,
    install: parsed.install,
    git: parsed.git,
    docker: parsed.docker,
    pm2: parsed.pm2,
    ci: parsed.ci,
    gitHooks: parsed['git-hooks'],
    openapi: parsed.openapi,
    otel: parsed.otel,
    example: parsed.example,
  };
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
}
