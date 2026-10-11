import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// The Prisma CLI doesn't read .env on its own.
if (existsSync('.env')) process.loadEnvFile('.env');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
