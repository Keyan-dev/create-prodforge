import { z } from 'zod';

/** Request body for registering and logging in. */
export const CredentialsSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(200),
});

/** Request body for exchanging a refresh token for new tokens. */
export const RefreshSchema = z.object({ refreshToken: z.string().min(1) });

export type Credentials = z.infer<typeof CredentialsSchema>;

export interface Account {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/** Storage for accounts. `auth.repository.ts` implements it for the chosen database. */
export interface AccountsRepository {
  findByEmail(email: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  /** Throws `AccountExistsError` if the email is already registered. */
  create(data: { email: string; passwordHash: string }): Promise<Account>;
}

/** An auth failure the error handler sends with its status (401 or 409). */
export class AuthError extends Error {
  readonly expose = true;

  constructor(
    readonly status: 401 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AccountExistsError extends AuthError {
  constructor() {
    super(409, 'An account with this email already exists');
  }
}
