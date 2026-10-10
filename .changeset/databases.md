---
'create-prodforge': minor
---

Add databases: `--db prisma` (the default), `--db drizzle` and `--db mongoose` generate a database client with a readiness check and graceful disconnect, a compose service, migrations run by a one-off `migrate` service, and an example `users` CRUD module (`--no-example` to skip it). The CLI now asks which database to use.
