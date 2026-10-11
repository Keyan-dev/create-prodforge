import { randomUUID } from 'node:crypto';
import {
  EmailTakenError,
  type User,
  type UsersRepository,
} from '../../src/modules/users/users.schema';

const users = new Map<string, User>();

const emailTaken = (email: string | undefined, id?: string) =>
  [...users.values()].some((user) => user.email === email && user.id !== id);

/**
 * An in-memory `UsersRepository`, so route tests run without a database. Tests swap it in with
 * `vi.mock('../src/modules/users/users.repository', ...)` and call `reset()` between tests.
 */
export const memoryUsersRepository: UsersRepository & { reset(): void } = {
  reset: () => users.clear(),
  list: async ({ limit, offset }) => [...users.values()].slice(offset, offset + limit),
  findById: async (id) => users.get(id) ?? null,
  async create(data) {
    if (emailTaken(data.email)) throw new EmailTakenError();
    const now = new Date();
    const user = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
    users.set(user.id, user);
    return user;
  },
  async update(id, data) {
    const user = users.get(id);
    if (!user) return null;
    if (emailTaken(data.email, id)) throw new EmailTakenError();
    const updated = { ...user, ...data, updatedAt: new Date() };
    users.set(id, updated);
    return updated;
  },
  remove: async (id) => users.delete(id),
};
