import { z } from 'zod';

/** Request body for creating a user. */
export const CreateUserSchema = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().min(1).max(100),
});

/** Request body for updating a user: any subset of the create fields. */
export const UpdateUserSchema = CreateUserSchema.partial();

/** Query string for listing users. */
export const ListUsersSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export type ListUsers = z.infer<typeof ListUsersSchema>;

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Storage for users. `users.repository.ts` implements it for the chosen database. */
export interface UsersRepository {
  list(query: ListUsers): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  /** Throws `EmailTakenError` if the email is already used. */
  create(data: CreateUser): Promise<User>;
  /** Returns null if there is no such user. Throws `EmailTakenError` on a duplicate email. */
  update(id: string, data: UpdateUser): Promise<User | null>;
  /** Returns false if there is no such user. */
  remove(id: string): Promise<boolean>;
}

/** Another user already has this email. The error handler sends it as a 409. */
export class EmailTakenError extends Error {
  readonly status = 409;
  readonly expose = true;

  constructor() {
    super('A user with this email already exists');
    this.name = 'EmailTakenError';
  }
}
