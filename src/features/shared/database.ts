import type { ProjectConfig } from '../../core/config';
import type { GeneratorContext } from '../../core/context';
import { images } from '../../core/versions';
import { dockerSupports } from '../docker';

/**
 * Helpers shared by the database features. They aren't features themselves, so database
 * features can use them without depending on each other.
 */

/** How README text should run a package.json script: `pnpm dev`, `npm run dev`, … */
export function runScript(cfg: ProjectConfig): string {
  return cfg.packageManager === 'npm' ? 'npm run' : cfg.packageManager;
}

/** DATABASE_URL in .env.example, the env schema and the compose app container. */
function databaseUrl(ctx: GeneratorContext, local: string, inCompose: string, schema: string) {
  ctx.env.add('DATABASE_URL', local, 'Database connection string');
  ctx.inject('src/config/env.ts', 'env', `DATABASE_URL: ${schema},`);
  ctx.compose.addAppEnv('DATABASE_URL', inCompose);
}

/** A PostgreSQL compose service with a named volume, a health check and DATABASE_URL. */
export function usePostgres(ctx: GeneratorContext): void {
  const credentials = 'postgres:postgres';
  databaseUrl(
    ctx,
    `postgresql://${credentials}@localhost:5432/app`,
    `postgresql://${credentials}@postgres:5432/app`,
    'z.url({ protocol: /^postgres(ql)?$/ })',
  );
  ctx.compose.addVolume('postgres-data');
  ctx.compose.addService('postgres', {
    image: images.postgres,
    environment: { POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'postgres', POSTGRES_DB: 'app' },
    ports: ['${POSTGRES_PORT:-5432}:5432'],
    volumes: ['postgres-data:/var/lib/postgresql'],
    healthcheck: {
      test: ['CMD-SHELL', 'pg_isready -U postgres -d app'],
      interval: '5s',
      timeout: '3s',
      retries: 10,
    },
  });
}

/** A MongoDB compose service with a named volume, a health check and DATABASE_URL. */
export function useMongo(ctx: GeneratorContext): void {
  databaseUrl(
    ctx,
    'mongodb://localhost:27017/app',
    'mongodb://mongo:27017/app',
    'z.url({ protocol: /^mongodb(\\+srv)?$/ })',
  );
  ctx.compose.addVolume('mongo-data');
  ctx.compose.addService('mongo', {
    image: images.mongo,
    ports: ['${MONGO_PORT:-27017}:27017'],
    volumes: ['mongo-data:/data/db'],
    healthcheck: {
      test: ['CMD', 'mongosh', '--quiet', '--eval', "db.adminCommand('ping')"],
      interval: '5s',
      timeout: '5s',
      retries: 10,
    },
  });
}

/**
 * The Getting started steps that bring the database up before `dev`: the compose service (when
 * Docker is on) and, if there is one, the migrate script.
 */
export function readmeSetup(ctx: GeneratorContext, service: string, migrateScript?: string): void {
  const compose = ctx.cfg.docker && dockerSupports(ctx.cfg.packageManager);
  const lines = compose
    ? [`docker compose up -d ${service}`]
    : [`# Point DATABASE_URL in .env at your database, then:`];
  if (migrateScript) lines.push(`${runScript(ctx.cfg)} ${migrateScript}`);
  else if (!compose) lines.pop();
  if (lines.length) ctx.inject('README.md', 'setup', lines.join('\n'));
}

/** Wire `src/db/client.ts` into the server: connect before listening, disconnect on shutdown. */
export function connectOnStartup(ctx: GeneratorContext): void {
  ctx.inject(
    'src/server.ts',
    'imports',
    "import { connectDatabase, disconnectDatabase } from './db/client';",
  );
  ctx.inject(
    'src/server.ts',
    'startup',
    [
      'try {',
      '  await connectDatabase();',
      '} catch (error) {',
      "  logger.fatal({ err: error }, 'Could not connect to the database. Is it running?');",
      '  process.exit(1);',
      '}',
      '',
      '',
    ].join('\n'),
  );
  ctx.inject(
    'src/server.ts',
    'shutdown',
    [
      'try {',
      '  await disconnectDatabase();',
      '} catch (closeError) {',
      "  logger.error({ err: closeError }, 'Error while closing the database');",
      '}',
    ].join('\n'),
  );
}
