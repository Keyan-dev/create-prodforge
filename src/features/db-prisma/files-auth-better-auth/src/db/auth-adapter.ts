import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './client';

/** Better Auth stores its users, sessions and accounts through Prisma (the Auth* models). */
export const authDatabase = prismaAdapter(prisma, { provider: 'postgresql' });
