import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env';
import { addReadinessCheck } from '../lib/readiness';
import * as schema from './schema';

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle({ client: pool, schema });

async function ping() {
  await pool.query('SELECT 1');
}

/** Called once at startup: fail fast if the database can't be reached, then report it in /ready. */
export async function connectDatabase() {
  await ping();
  addReadinessCheck('database', ping);
}

export async function disconnectDatabase() {
  await pool.end();
}
