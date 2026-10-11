import type { Feature } from '../core/feature';
import { base } from './base';
import { dbDrizzle } from './db-drizzle';
import { dbMongoose } from './db-mongoose';
import { dbPrisma } from './db-prisma';
import { docker } from './docker';
import { exampleUsers } from './example-users';
import { frameworkExpress } from './framework-express';
import { frameworkFastify } from './framework-fastify';
import { frameworkHono } from './framework-hono';
import { ciGithub } from './ci-github';
import { gitHooks } from './git-hooks';
import { lintBiome } from './lint-biome';
import { openapi } from './openapi';
import { lintEslint } from './lint-eslint';
import { pm2 } from './pm2';
import { testingVitest } from './testing-vitest';

/** Every feature, in the order ties are broken. `dependsOn` decides the rest. */
export const features: Feature[] = [
  base,
  frameworkExpress,
  frameworkFastify,
  frameworkHono,
  dbPrisma,
  dbDrizzle,
  dbMongoose,
  exampleUsers,
  openapi,
  testingVitest,
  lintEslint,
  lintBiome,
  gitHooks,
  ciGithub,
  docker,
  pm2,
];
