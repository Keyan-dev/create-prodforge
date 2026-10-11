import { createMiddleware } from 'hono/factory';
import { type AppEnv, createRouter } from '../../lib/hono';
import { CredentialsSchema, RefreshSchema } from './auth.schema';
import { type AuthUser, authService } from './auth.service';

/** Rejects a request without a valid access token (401); the account is in `c.get('user')`. */
export const requireAuth = createMiddleware<AppEnv & { Variables: { user: AuthUser } }>(
  async (c, next) => {
    c.set('user', await authService.authenticate(c.req.header('authorization')));
    await next();
  },
);

export const authRoutes = createRouter()
  .post('/register', async (c) =>
    c.json(await authService.register(CredentialsSchema.parse(await c.req.json())), 201),
  )
  .post('/login', async (c) =>
    c.json(await authService.login(CredentialsSchema.parse(await c.req.json()))),
  )
  .post('/refresh', async (c) =>
    c.json(await authService.refresh(RefreshSchema.parse(await c.req.json()).refreshToken)),
  )
  .get('/me', requireAuth, (c) => c.json(c.get('user')));
