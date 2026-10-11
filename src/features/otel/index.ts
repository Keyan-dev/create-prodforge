import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';

const IMPORT_BUILT = '--import ./dist/instrumentation.js';
const IMPORT_SOURCE = '--import ./src/instrumentation.ts';

/**
 * OpenTelemetry tracing with the Node SDK and auto-instrumentations. `src/instrumentation.ts` is
 * built as its own entry and loaded with `--import` before the app, by every script that runs
 * the server or worker, the Docker image (NODE_OPTIONS) and PM2.
 */
export const otel: Feature = {
  id: 'otel',
  label: 'OpenTelemetry',
  enabled: (cfg) => cfg.otel,
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(
      pick(
        '@opentelemetry/auto-instrumentations-node',
        '@opentelemetry/instrumentation',
        '@opentelemetry/sdk-node',
      ),
    );
    await ctx.files.copyDir(featureFiles('otel'));
    ctx.inject('tsdown.config.ts', 'entries', "'src/instrumentation.ts',");

    ctx.env.add('OTEL_SERVICE_NAME', ctx.cfg.name, 'Service name on traces');
    ctx.env.add(
      'OTEL_EXPORTER_OTLP_ENDPOINT',
      'http://localhost:4318',
      'OTLP/HTTP collector that receives traces',
    );
    ctx.env.add('OTEL_TRACES_EXPORTER', 'none', 'otlp to send traces, console to print them, none');

    ctx.inject('Dockerfile', 'runtime', `ENV NODE_OPTIONS="${IMPORT_BUILT}"`, { optional: true });
    ctx.inject('ecosystem.config.cjs', 'env', `NODE_OPTIONS: '${IMPORT_BUILT}',`, {
      optional: true,
    });
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## OpenTelemetry',
        '',
        '`src/instrumentation.ts` starts OpenTelemetry tracing before the app loads, so HTTP requests, database and Redis calls become spans and Pino logs carry the trace id. Every start script loads it with `--import`. Traces are off until you set `OTEL_TRACES_EXPORTER=otlp` and point `OTEL_EXPORTER_OTLP_ENDPOINT` at a collector (or use `console` to print them).',
      ].join('\n'),
    );
  },
  // Runs after every feature has added its scripts, so the worker's scripts get the flag too.
  finalize(ctx) {
    for (const [name, script] of Object.entries(ctx.pkg.scripts())) {
      if (/^tsx watch .*src\/\w+\.ts$/.test(script)) {
        ctx.pkg.updateScript(name, (s) => s.replace('tsx watch ', `tsx watch ${IMPORT_SOURCE} `));
      } else if (/^node .*dist\/\w+\.js$/.test(script)) {
        ctx.pkg.updateScript(name, (s) => s.replace('node ', `node ${IMPORT_BUILT} `));
      }
    }
  },
};
