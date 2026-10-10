import type { Feature } from '../core/feature';
import { base } from './base';
import { dbDrizzle } from './db-drizzle';
import { dbMongoose } from './db-mongoose';
import { dbPrisma } from './db-prisma';
import { docker } from './docker';
import { exampleUsers } from './example-users';
import { frameworkExpress } from './framework-express';
import { lintEslint } from './lint-eslint';
import { pm2 } from './pm2';
import { testingVitest } from './testing-vitest';

/** Every feature, in the order ties are broken. `dependsOn` decides the rest. */
export const features: Feature[] = [
  base,
  frameworkExpress,
  dbPrisma,
  dbDrizzle,
  dbMongoose,
  exampleUsers,
  testingVitest,
  lintEslint,
  docker,
  pm2,
];
