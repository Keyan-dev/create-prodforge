import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/**
 * Email + password auth with JWTs (jose): register, login, refresh and `me` routes, scrypt
 * password hashes, short-lived access tokens and longer-lived refresh tokens. This feature owns
 * the framework-independent part (service, schemas, token and password helpers); the database
 * feature stores accounts and the framework feature adds the routes and their tests.
 */
export const authJwt: Feature = {
  id: 'auth-jwt',
  label: 'JWT auth',
  enabled: (cfg) => cfg.auth === 'jwt' && cfg.db !== 'none',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('jose'));
    await ctx.files.copyDir(featureFiles('auth-jwt'));

    ctx.env.add(
      'JWT_SECRET',
      'change-me-to-a-long-random-string-of-32-chars-or-more',
      'Signs access and refresh tokens; at least 32 characters (openssl rand -base64 48)',
    );
    ctx.env.add('JWT_ACCESS_TTL', '15m', 'Access token lifetime');
    ctx.env.add('JWT_REFRESH_TTL', '7d', 'Refresh token lifetime');
    ctx.inject(
      'src/config/env.ts',
      'env',
      [
        'JWT_SECRET: z.string().min(32),',
        "JWT_ACCESS_TTL: z.string().default('15m'),",
        "JWT_REFRESH_TTL: z.string().default('7d'),",
      ].join('\n'),
    );

    if (ctx.cfg.openapi) {
      await ctx.files.copyDir(featureFiles('auth-jwt', 'files-openapi'));
      ctx.inject(
        'src/openapi/document.ts',
        'imports',
        "import { authPaths } from '../modules/auth/auth.openapi';",
      );
      ctx.inject('src/openapi/document.ts', 'paths', '...authPaths,');
      ctx.inject(
        'src/openapi/document.ts',
        'document',
        "components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },",
      );
    }

    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Auth',
        '',
        'Email and password accounts with JWTs, in `src/modules/auth`:',
        '',
        '- `POST /auth/register` and `POST /auth/login` take `{ "email", "password" }` and return an access token and a refresh token',
        '- `POST /auth/refresh` takes `{ "refreshToken" }` and returns new tokens',
        '- `GET /auth/me` returns the account for `Authorization: Bearer <access token>`',
        '',
        'Protect your own routes with the `requireAuth` middleware in the same module. Passwords are hashed with scrypt. Set `JWT_SECRET` to a long random value in every environment. Refresh tokens are stateless: they stay valid until they expire, so keep `JWT_REFRESH_TTL` short or add a denylist if you need to revoke them.',
      ].join('\n'),
    );
  },
};
