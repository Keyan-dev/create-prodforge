import { prisma } from '../../db/client';
import { Prisma } from '../../generated/prisma/client';
import { EmailTakenError, type UsersRepository } from './users.schema';

/** P2002: unique constraint failed (the email). P2025: the record to change doesn't exist. */
function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export const usersRepository: UsersRepository = {
  list: ({ limit, offset }) =>
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, take: limit, skip: offset }),

  findById: (id) => prisma.user.findUnique({ where: { id } }),

  async create(data) {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      if (isPrismaError(error, 'P2002')) throw new EmailTakenError();
      throw error;
    }
  },

  async update(id, data) {
    try {
      return await prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) return null;
      if (isPrismaError(error, 'P2002')) throw new EmailTakenError();
      throw error;
    }
  },

  async remove(id) {
    const { count } = await prisma.user.deleteMany({ where: { id } });
    return count > 0;
  },
};
