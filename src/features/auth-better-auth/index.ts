import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/**
 * Better Auth with email and password: `src/lib/auth.ts` configures it on the database
 * feature's adapter (`src/db/auth-adapter.ts`, with the tables and migrations that feature
 * ships); the framework feature mounts its handler at /api/auth and adds a protected
 * `GET /auth/me` example with its tests.
 */
export const authBetterAuth: Feature = {
  id: 'auth-better-auth',
  label: 'Better Auth',
  enabled: (cfg) => cfg.auth === 'better-auth' && cfg.db !== 'none',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('better-auth'));
    await ctx.files.copyDir(featureFiles('auth-better-auth'));

    ctx.env.add(
      'BETTER_AUTH_SECRET',
      'change-me-to-a-long-random-string-of-32-chars-or-more',
      'Signs sessions; at least 32 characters (openssl rand -base64 48)',
    );
    ctx.env.add('BETTER_AUTH_URL', 'http://localhost:3000', 'Public base URL of this API');
    ctx.inject(
      'src/config/env.ts',
      'env',
      [
        'BETTER_AUTH_SECRET: z.string().min(32),',
        "BETTER_AUTH_URL: z.url().default('http://localhost:3000'),",
      ].join('\n'),
    );
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Auth',
        '',
        '[Better Auth](https://www.better-auth.com) handles accounts and sessions, configured in `src/lib/auth.ts` and served under `/api/auth`:',
        '',
        '- `POST /api/auth/sign-up/email` with `{ "email", "password", "name" }`',
        '- `POST /api/auth/sign-in/email` with `{ "email", "password" }`',
        '- `GET /api/auth/get-session` and `POST /api/auth/sign-out`',
        '- `GET /auth/me` is an example route that requires a session',
        '',
        'Sessions work as a cookie, or as `Authorization: Bearer <token>` with the token from the `set-auth-token` response header. Its tables are in the database schema with an `auth` prefix. Set `BETTER_AUTH_SECRET` to a long random value and `BETTER_AUTH_URL` to the public URL in every environment. For a browser app on another origin, list it in `CORS_ORIGIN` (Better Auth trusts those origins too).',
      ].join('\n'),
    );
  },
};
