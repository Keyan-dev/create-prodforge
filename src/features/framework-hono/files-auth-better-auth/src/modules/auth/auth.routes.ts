import { HTTPException } from 'hono/http-exception';
import { createMiddleware } from 'hono/factory';
import { auth } from '../../lib/auth';
import { type AppEnv, createRouter } from '../../lib/hono';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/** Rejects a request without a valid session (401); the session is in `c.get('session')`. */
export const requireSession = createMiddleware<AppEnv & { Variables: { session: Session } }>(
  async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new HTTPException(401, { message: 'Authentication required' });
    c.set('session', session);
    await next();
  },
);

/** Better Auth's own routes under /api/auth (sign-up, sign-in, sessions, …). */
export const betterAuthRoutes = createRouter().on(['GET', 'POST'], '/api/auth/*', (c) =>
  auth.handler(c.req.raw),
);

/** An example protected route: the signed-in user. */
export const authRoutes = createRouter().get('/me', requireSession, (c) =>
  c.json(c.get('session').user),
);
