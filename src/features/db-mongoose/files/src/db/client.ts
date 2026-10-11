import mongoose from 'mongoose';
import { env } from '../config/env';
import { addReadinessCheck } from '../lib/readiness';

async function ping() {
  const { db } = mongoose.connection;
  if (!db) throw new Error('Not connected to MongoDB');
  await db.admin().ping();
}

/**
 * Called once at startup: connect (failing fast if MongoDB can't be reached), build model
 * indexes, then report the connection in /ready.
 */
export async function connectDatabase() {
  await mongoose.connect(env.DATABASE_URL, { serverSelectionTimeoutMS: 5000 });
  // Wait for indexes (such as unique constraints) so they hold from the first request.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
  addReadinessCheck('database', ping);
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
