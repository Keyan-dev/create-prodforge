import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick, versions } from '../../core/versions';

/**
 * OpenAPI 3.1 document built from Zod schemas with zod-openapi (`src/openapi/document.ts`). The
 * framework feature serves it at /openapi.json with a Scalar docs page at /docs; the example
 * users module adds its paths through the `paths` slot.
 */
export const openapi: Feature = {
  id: 'openapi',
  label: 'OpenAPI + Scalar',
  enabled: (cfg) => cfg.openapi,
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('zod-openapi'));
    await ctx.files.copyDir(featureFiles('openapi'), '.', {
      scalarVersion: versions['@scalar/api-reference'],
    });
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## API docs',
        '',
        'The OpenAPI 3.1 document is built from Zod schemas in `src/openapi/document.ts` and served at `/openapi.json`. Browse it at `http://localhost:3000/docs` (Scalar). When you add a route, add its paths to the document too.',
      ].join('\n'),
    );
  },
};
