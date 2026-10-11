import { Scalar } from '@scalar/hono-api-reference';
import { createRouter } from '../../lib/hono';
import { docsContentSecurityPolicy, scalarCdn } from '../../openapi/docs-page';
import { openApiDocument } from '../../openapi/document';

/** The OpenAPI document at /openapi.json and interactive API docs (Scalar) at /docs. */
export const docsRoutes = createRouter()
  .get('/openapi.json', (c) => c.json(openApiDocument))
  .get(
    '/docs',
    async (c, next) => {
      await next();
      c.header('content-security-policy', docsContentSecurityPolicy);
    },
    Scalar({ url: '/openapi.json', cdn: scalarCdn }),
  );
