---
'create-prodforge': minor
---

Add `--cache redis` (a shared ioredis connection with a readiness check and a compose service), `--cache bullmq` (background jobs in a separate worker process, with compose and PM2 entries), and `--otel` (OpenTelemetry tracing loaded before the app).
