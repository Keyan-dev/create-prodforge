import { issueTokens, verifyToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import { accountsRepository } from './auth.repository';
import { AuthError, type Credentials } from './auth.schema';

const invalidCredentials = () => new AuthError(401, 'Invalid email or password');

/** Framework-independent auth logic; the routes only parse requests and send responses. */
export const authService = {
  async register({ email, password }: Credentials) {
    const account = await accountsRepository.create({
      email,
      passwordHash: await hashPassword(password),
    });
    return issueTokens(account.id);
  },

  async login({ email, password }: Credentials) {
    const account = await accountsRepository.findByEmail(email);
    if (!account || !(await verifyPassword(password, account.passwordHash))) {
      throw invalidCredentials();
    }
    return issueTokens(account.id);
  },

  /** Refresh tokens are stateless JWTs: valid until they expire (see the README). */
  async refresh(refreshToken: string) {
    const id = await verifyToken(refreshToken, 'refresh');
    if (!id || !(await accountsRepository.findById(id))) {
      throw new AuthError(401, 'Invalid refresh token');
    }
    return issueTokens(id);
  },

  /** The account behind an `Authorization: Bearer <access token>` header. */
  async authenticate(authorization: string | undefined) {
    const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
    const id = token && (await verifyToken(token, 'access'));
    const account = id ? await accountsRepository.findById(id) : null;
    if (!account) throw new AuthError(401, 'Authentication required');
    return { id: account.id, email: account.email };
  },
};

export type AuthUser = Awaited<ReturnType<typeof authService.authenticate>>;
