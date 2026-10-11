import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import { CredentialsSchema, RefreshSchema } from './auth.schema';
import { type AuthUser, authService } from './auth.service';

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth`. */
    user?: AuthUser;
  }
}

/** Rejects a request without a valid access token (401); the account is in `request.user`. */
export const requireAuth: preHandlerAsyncHookHandler = async (request) => {
  request.user = await authService.authenticate(request.headers.authorization);
};

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) =>
    reply.code(201).send(await authService.register(CredentialsSchema.parse(request.body))),
  );
  app.post('/login', async (request) => authService.login(CredentialsSchema.parse(request.body)));
  app.post('/refresh', async (request) =>
    authService.refresh(RefreshSchema.parse(request.body).refreshToken),
  );
  app.get('/me', { preHandler: requireAuth }, async (request) => request.user);
};
