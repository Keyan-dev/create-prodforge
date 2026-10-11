import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins';
import { env } from '../config/env';
import { authDatabase } from '../db/auth-adapter';

/**
 * Better Auth: email and password sign-up and sign-in with database sessions, served under
 * /api/auth (e.g. POST /api/auth/sign-up/email, POST /api/auth/sign-in/email,
 * GET /api/auth/get-session). Sessions work as a cookie, or as `Authorization: Bearer <token>`
 * with the token from the `set-auth-token` response header (the bearer plugin).
 * Add social providers and plugins here: https://www.better-auth.com/docs
 */
export const auth = betterAuth({
  database: authDatabase,
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  trustedOrigins: env.CORS_ORIGIN === '*' ? [] : env.CORS_ORIGIN.split(','),
  emailAndPassword: { enabled: true },
  plugins: [bearer()],
  // Prefixed so they never clash with your own users table or model.
  user: { modelName: 'authUser' },
  session: { modelName: 'authSession' },
  account: { modelName: 'authAccount' },
  verification: { modelName: 'authVerification' },
});
