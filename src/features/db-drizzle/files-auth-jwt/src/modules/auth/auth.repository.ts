import { eq } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { db } from '../../db/client';
import { accounts } from '../../db/schema';
import { AccountExistsError, type AccountsRepository } from './auth.schema';

/** 23505: unique_violation, here the email. Drizzle wraps driver errors, so check the cause too. */
function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return cause instanceof DatabaseError && cause.code === '23505';
}

export const accountsRepository: AccountsRepository = {
  async findByEmail(email) {
    const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
    return account ?? null;
  },

  async findById(id) {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account ?? null;
  },

  async create(data) {
    try {
      const [account] = await db.insert(accounts).values(data).returning();
      if (!account) throw new Error('Insert returned no row');
      return account;
    } catch (error) {
      if (isUniqueViolation(error)) throw new AccountExistsError();
      throw error;
    }
  },
};
