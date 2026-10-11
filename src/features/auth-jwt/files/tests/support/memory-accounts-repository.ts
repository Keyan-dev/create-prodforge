import { randomUUID } from 'node:crypto';
import {
  type Account,
  AccountExistsError,
  type AccountsRepository,
} from '../../src/modules/auth/auth.schema';

const accounts = new Map<string, Account>();

/** In-memory accounts for tests, so the auth routes run without a database. */
export const memoryAccountsRepository: AccountsRepository & { reset(): void } = {
  findByEmail: async (email) => [...accounts.values()].find((a) => a.email === email) ?? null,
  findById: async (id) => accounts.get(id) ?? null,
  create: async (data) => {
    if ([...accounts.values()].some((account) => account.email === data.email)) {
      throw new AccountExistsError();
    }
    const account = { id: randomUUID(), ...data, createdAt: new Date() };
    accounts.set(account.id, account);
    return account;
  },
  reset: () => accounts.clear(),
};
