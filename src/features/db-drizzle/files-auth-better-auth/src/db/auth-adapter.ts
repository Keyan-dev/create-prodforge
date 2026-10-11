import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './client';
import * as schema from './schema';

/** Better Auth stores its users, sessions and accounts through Drizzle (the auth* tables). */
export const authDatabase = drizzleAdapter(db, { provider: 'pg', schema });
