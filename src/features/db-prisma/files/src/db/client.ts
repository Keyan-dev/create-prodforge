import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';
import { addReadinessCheck } from '../lib/readiness';

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

async function ping() {
  await prisma.$queryRaw`SELECT 1`;
}

/** Called once at startup: fail fast if the database can't be reached, then report it in /ready. */
export async function connectDatabase() {
  await ping();
  addReadinessCheck('database', ping);
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
