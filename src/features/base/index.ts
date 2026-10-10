import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick, versions } from '../../core/versions';

/**
 * TypeScript project skeleton: package.json basics, tsconfig, tsdown build and editor files,
 * plus the framework-agnostic runtime pieces: Zod-validated env, Pino logger, readiness checks.
 */
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
      .addDeps(pick('pino', 'zod'))
      .addDevDeps(pick('@types/node', 'pino-pretty', 'tsdown', 'tsx', 'typescript'));
    if (cfg.packageManager === 'pnpm') {
      // Pin pnpm so local installs, CI and the Docker image all produce the same lockfile.
      ctx.pkg.set('packageManager', `pnpm@${versions.pnpm}`);
      // pnpm 10 skips dependency build scripts unless allowed; tsx needs esbuild's.
      ctx.pkg.set('pnpm', { onlyBuiltDependencies: ['esbuild'] });
    }
    ctx.env.add('NODE_ENV', 'development', 'development | test | production');
    ctx.env.add('PORT', '3000', 'Port the HTTP server listens on');
    ctx.env.add('LOG_LEVEL', 'debug', 'fatal | error | warn | info | debug | trace | silent');
    ctx.env.add('SHUTDOWN_TIMEOUT_MS', '10000', 'How long to wait for open requests on shutdown');
    await ctx.files.copyDir(featureFiles('base'));
  },
};
