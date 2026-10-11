import { prisma } from '../../db/client';
import { Prisma } from '../../generated/prisma/client';
import { AccountExistsError, type AccountsRepository } from './auth.schema';

export const accountsRepository: AccountsRepository = {
  findByEmail: (email) => prisma.account.findUnique({ where: { email } }),

  findById: (id) => prisma.account.findUnique({ where: { id } }),

  async create(data) {
    try {
      return await prisma.account.create({ data });
    } catch (error) {
      // P2002: unique constraint failed (the email).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AccountExistsError();
      }
      throw error;
    }
  },
};
