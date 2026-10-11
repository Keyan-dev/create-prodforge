import { register } from 'node:module';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

/**
 * OpenTelemetry tracing. Node loads this before the app (`--import`), so HTTP, the framework,
 * database clients and Redis are instrumented automatically, and Pino logs carry the trace id.
 *
 * Configure it with the standard OTEL_* variables: OTEL_SERVICE_NAME,
 * OTEL_EXPORTER_OTLP_ENDPOINT (an OTLP/HTTP collector, default http://localhost:4318),
 * OTEL_TRACES_EXPORTER (otlp, console or none) and OTEL_SDK_DISABLED=true to turn it off.
 */

// Patch ES modules as they load (the app is ESM).
register('@opentelemetry/instrumentation/hook.mjs', import.meta.url);

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      // File system spans are noisy and rarely useful.
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

// Flush pending spans on shutdown. The app's own handlers do the rest.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void sdk.shutdown();
  });
}
