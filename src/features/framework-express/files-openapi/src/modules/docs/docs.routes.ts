import { apiReference } from '@scalar/express-api-reference';
import { Router } from 'express';
import { docsContentSecurityPolicy, scalarCdn } from '../../openapi/docs-page';
import { openApiDocument } from '../../openapi/document';

export const docsRouter = Router();

/** The OpenAPI document. */
docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

/** Interactive API docs (Scalar), rendered from /openapi.json. */
docsRouter.use(
  '/docs',
  (_req, res, next) => {
    res.setHeader('Content-Security-Policy', docsContentSecurityPolicy);
    next();
  },
  apiReference({ url: '/openapi.json', cdn: scalarCdn }),
);
