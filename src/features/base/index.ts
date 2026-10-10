import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

/** TypeScript project skeleton: package.json basics, tsconfig, tsdown build, editor files. */
export const base: Feature = {
  id: 'base',
  label: 'TypeScript base',
  enabled: () => true,
  async apply(ctx) {
    const { cfg } = ctx;
    ctx.pkg
      .set('name', cfg.name)
      .set('version', '0.1.0')
      .set('private', true)
      .set('type', 'module')
      .set('engines', { node: `>=${cfg.node}` })
      .addScripts({
        dev: 'tsx watch --env-file-if-exists=.env src/server.ts',
        build: 'tsdown',
        start: 'node --env-file-if-exists=.env dist/server.js',
        typecheck: 'tsc --noEmit',
      })
      .addDevDeps(pick('@types/node', 'tsdown', 'tsx', 'typescript'));
    if (cfg.packageManager === 'pnpm') {
      // pnpm 10 skips dependency build scripts unless allowed; tsx needs esbuild's.
      ctx.pkg.set('pnpm', { onlyBuiltDependencies: ['esbuild'] });
    }
    ctx.env.add('PORT', '3000', 'Port the HTTP server listens on');
    await ctx.files.copyDir(featureFiles('base'));
  },
};
