import scalar from '@scalar/fastify-api-reference';
import type { FastifyPluginAsync } from 'fastify';
import { docsContentSecurityPolicy } from '../../openapi/docs-page';
import { openApiDocument } from '../../openapi/document';

/** The OpenAPI document at /openapi.json and interactive API docs (Scalar) at /docs. */
export const docsRoutes: FastifyPluginAsync = async (app) => {
  // Runs after helmet's hook (this plugin is encapsulated), so these routes get the docs CSP.
  app.addHook('onRequest', async (_request, reply) => {
    reply.header('content-security-policy', docsContentSecurityPolicy);
  });

  app.get('/openapi.json', async () => openApiDocument);

  await app.register(scalar, { routePrefix: '/docs', configuration: { url: '/openapi.json' } });
};
