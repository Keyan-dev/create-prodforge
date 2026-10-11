import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { auth } from '../../lib/auth';
import { HttpError } from '../../middleware/error-handler';

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireSession`. */
    session?: Session;
  }
}

/** Turn a Fastify request into the web `Request` Better Auth handles. */
function toWebRequest(request: FastifyRequest) {
  const url = new URL(request.url, `${request.protocol}://${request.host}`);
  return new Request(url, {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    ...(request.body !== undefined && { body: JSON.stringify(request.body) }),
  });
}

/** Better Auth's own routes under /api/auth (sign-up, sign-in, sessions, …). */
export const betterAuthRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const response = await auth.handler(toWebRequest(request));
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
};

/** Rejects a request without a valid session (401); the session is in `request.session`. */
export const requireSession: preHandlerAsyncHookHandler = async (request) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) throw new HttpError(401, 'Authentication required');
  request.session = session;
};

/** An example protected route: the signed-in user. */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: requireSession }, async (request) => request.session?.user);
};
