import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { MongoClient } from 'mongodb';
import { env } from '../config/env';

// Better Auth talks to MongoDB through the driver directly, with its own small pool. The client
// connects on first use, so importing this needs no running database.
const client = new MongoClient(env.DATABASE_URL);

/**
 * Better Auth stores its users, sessions and accounts in the auth* collections. Transactions need
 * a replica set, which the compose `mongo` service isn't; turn them on if your server is one.
 */
export const authDatabase = mongodbAdapter(client.db(), { client, transaction: false });

export async function closeAuthDatabase() {
  await client.close();
}
