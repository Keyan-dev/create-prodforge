# create-prodforge

## 0.1.0

### Minor Changes

- [#25](https://github.com/Keyan-dev/create-prodforge/pull/25) [`f18c56b`](https://github.com/Keyan-dev/create-prodforge/commit/f18c56b31366f49282315578a8902f2b1f5b5450) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add `--auth jwt` (register, login, refresh and a protected `/auth/me` with jose and scrypt) and `--auth better-auth` (Better Auth with email and password and bearer tokens), for every framework and database.

- [#20](https://github.com/Keyan-dev/create-prodforge/pull/20) [`2020243`](https://github.com/Keyan-dev/create-prodforge/commit/2020243b0337cd42c0b5d05c53ba707708a5e891) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add databases: `--db prisma` (the default), `--db drizzle` and `--db mongoose` generate a database client with a readiness check and graceful disconnect, a compose service, migrations run by a one-off `migrate` service, and an example `users` CRUD module (`--no-example` to skip it). The CLI now asks which database to use.

- [#16](https://github.com/Keyan-dev/create-prodforge/pull/16) [`c3a55a7`](https://github.com/Keyan-dev/create-prodforge/commit/c3a55a7b56b85c5d32fe4865152d59d676de782d) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - `create-prodforge my-api` now generates a working Express 5 + TypeScript project with Vitest, ESLint and Prettier, then installs dependencies and runs `git init`. Use `--yes` to skip prompts, or flags such as `--pm`, `--node`, `--no-install` and `--no-git`.

- [#22](https://github.com/Keyan-dev/create-prodforge/pull/22) [`8549c0d`](https://github.com/Keyan-dev/create-prodforge/commit/8549c0df1ff380de488ac8161971d098502ff676) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add `--framework fastify` and `--framework hono`, `--lint biome`, git hooks (Husky, lint-staged, commitlint), a GitHub Actions CI workflow, and OpenAPI docs built from the Zod schemas with a Scalar page at `/docs`. The CLI now also asks for the framework, linter and extras. `BODY_LIMIT` is now `BODY_LIMIT_KB` in generated projects.

- [#26](https://github.com/Keyan-dev/create-prodforge/pull/26) [`7879092`](https://github.com/Keyan-dev/create-prodforge/commit/7879092c78fc9e1b1a4b01888a8333e10674ef85) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add `--preset minimal|api|full` (or a JSON preset file), `--dry-run` to preview the files and package.json, and `--latest` to use the newest npm releases instead of the tested pins. The prompts now also ask about Redis, auth and OpenTelemetry.

- [#26](https://github.com/Keyan-dev/create-prodforge/pull/26) [`7879092`](https://github.com/Keyan-dev/create-prodforge/commit/7879092c78fc9e1b1a4b01888a8333e10674ef85) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add `create-prodforge add <add-on...>` to turn on Redis, BullMQ, JWT, Better Auth, OpenTelemetry and the other extras in an existing project. Projects now record their options in `.prodforge.json`.

- [#18](https://github.com/Keyan-dev/create-prodforge/pull/18) [`50644fc`](https://github.com/Keyan-dev/create-prodforge/commit/50644fc5070fefed65dc134a2d18622909935bcb) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Generated projects now include Pino logging, typed env validation with Zod, a JSON error handler, graceful shutdown, `/health` and `/ready` endpoints, helmet, CORS and rate limiting, plus a multi-stage Dockerfile with `compose.yaml` and a PM2 cluster config.

- [#24](https://github.com/Keyan-dev/create-prodforge/pull/24) [`3423f2d`](https://github.com/Keyan-dev/create-prodforge/commit/3423f2d8936fd8f98e96789fa1c76dfe5b4e56ca) Thanks [@Keyan-dev](https://github.com/Keyan-dev)! - Add `--cache redis` (a shared ioredis connection with a readiness check and a compose service), `--cache bullmq` (background jobs in a separate worker process, with compose and PM2 entries), and `--otel` (OpenTelemetry tracing loaded before the app).
