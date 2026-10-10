import { asc, eq } from 'drizzle-orm';
import { DatabaseError } from 'pg';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import { EmailTakenError, type UsersRepository } from './users.schema';

/** 23505: unique_violation, here the email. Drizzle wraps driver errors, so check the cause too. */
function isUniqueViolation(error: unknown) {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return cause instanceof DatabaseError && cause.code === '23505';
}

export const usersRepository: UsersRepository = {
  list: ({ limit, offset }) =>
    db.select().from(users).orderBy(asc(users.createdAt)).limit(limit).offset(offset),

  async findById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  },

  async create(data) {
    try {
      const [user] = await db.insert(users).values(data).returning();
      if (!user) throw new Error('Insert returned no row');
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailTakenError();
      throw error;
    }
  },

  async update(id, data) {
    // An empty SET is invalid SQL, so a no-op update just reads the user.
    if (Object.keys(data).length === 0) return usersRepository.findById(id);
    try {
      const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
      return user ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailTakenError();
      throw error;
    }
  },

  async remove(id) {
    const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    return deleted.length > 0;
  },
};
