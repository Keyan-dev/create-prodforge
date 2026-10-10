# Decisions


## 2026-10-10 · Phase 0 bootstrap

- **TypeScript is pinned to `~6.0`, not 7.** TS 7 is `latest` on npm, but `typescript-eslint` 8.x only supports `<6.1`. Move to 7 once typescript-eslint does.
- **`moduleResolution: bundler` + `module: preserve`.** tsdown bundles everything into `dist/index.js`, so source imports stay extensionless and Node never resolves them directly. `tsc` is used for type-checking only (`noEmit`).
- **The CLI's version comes from `package.json`**, imported as JSON and inlined by tsdown. It is never written by hand anywhere else, so a changeset bump updates `--version` automatically.
- **citty is in from Phase 0.** It gives `--version` and `--help` for free and is the arg parser PLAN.md §4 already names. Runtime deps of the CLI itself go in `package.json` as usual; `src/core/versions.ts` (Phase 1) is only for versions used in *generated* projects.
- **tsdown emits `.js` (`fixedExtension: false`)** so the `bin` path is `dist/index.js`, matching PLAN.md's Done-when check.
- **Prettier skips Markdown.** It would reflow PLAN.md and the other hand-written docs; code and config are still format-checked in CI.
- **`pnpm test:e2e` already exists** with its own Vitest config (`tests/e2e/`) and passes with no tests until Phase 2 adds the matrix.
- **CI runs on Node from `.nvmrc` (24)** and finishes with a smoke test that compares `node dist/index.js --version` to `package.json`.


## 2026-10-10 · Default template stack

These pick the ★ defaults that `--yes` and `--preset api` use. PLAN.md §2 already marks most of them; this section records why, and settles the three items in §10 plus a few gaps the table leaves open.

### Settled in PLAN.md, recorded here with the reason

- **Framework: Express 5.** It's the one most users already know, and v5 finally handles async errors natively. *Tradeoff:* Fastify is faster and has first-class schema/OpenAPI support. Hono is lighter and runs on edge runtimes. Both stay as options; Express is the safest default for a "production-ready" first run.
- **Database: Prisma + PostgreSQL.** Postgres is the default most teams pick. Prisma 7 ships without the Rust engine binary, is ESM-first, and has the smoothest migrate story for a generated project. *Tradeoff:* Drizzle is thinner, closer to SQL, and has no codegen step. It stays an option for people who'd rather write SQL.
- **Validation: Zod 4** for request bodies and typed env. The same schemas also feed OpenAPI, so it's one dependency doing three jobs.
- **Lint/format: ESLint (flat config) + Prettier.** It has the widest plugin ecosystem and matches what the CLI repo itself uses. *Tradeoff:* Biome is one fast tool with no config sprawl, but it has fewer rules. It's offered as the alternative.
- **Testing: Vitest + Supertest.** It's ESM-native with no transform config, and Supertest works against the `app.ts` factory without opening a port.
- **API docs: on by default** (OpenAPI from Zod + Scalar UI). It costs little once Zod is in, and it's what people expect from an API template. *Tradeoff:* it's one more route and dependency in a minimal service. The `minimal` preset turns it off.
- **CI: GitHub Actions on.** Most users host on GitHub. The workflow mirrors our e2e steps (lint → typecheck → test → build → docker build). `--no-ci` drops it.
- **Git hooks: Husky + lint-staged + commitlint on.** *Tradeoff:* commitlint annoys people who don't use conventional commits. It's kept in `api` and `full` and dropped in `minimal`.

### Open items, with a recommendation

- **Docker base image: `node:24-alpine` (non-root `node` user), not distroless.** Distroless has no shell, so `prisma migrate deploy` at startup and compose `healthcheck` commands (`wget`) don't work without extra steps. Prisma 7 dropping engine binaries removes the old musl/alpine pain. *Tradeoff:* distroless has a smaller attack surface. That can become a `--docker-base distroless` option later. (Settles PLAN.md §10.)
- **Docker and PM2 are both on, but PM2 never runs inside the container.** The Dockerfile runs `node dist/server.js` directly. Docker/k8s already handles restarts, and scaling happens through replicas. `ecosystem.config.cjs` is for VM/bare-metal deploys. *Tradeoff:* users who want PM2 cluster mode in a container have to switch to `pm2-runtime` themselves. We document how, but it isn't the default.
- **Example CRUD module: on when a database is selected, off otherwise.** The `users` module is what proves the DB wiring works (Phase 4's Done-when runs migrations against it), and with no DB it has nothing to show. `--no-example` removes it. *Tradeoff:* some users will delete it on day one, but deleting a folder is cheaper than wiring a DB from scratch. (Settles PLAN.md §10.)
- **Auth: none by default.** Auth choices depend heavily on the product (sessions vs. tokens, third-party IdP), and a wrong default is worse than none. JWT and Better Auth stay opt-in. The `full` preset uses Better Auth. *Tradeoff:* `--yes` gives you an API with no auth, and the generated README says so.
- **Cache/queue: none by default.** Most new services don't need Redis on day one, and it adds a compose service and an env var. `full` turns on Redis + BullMQ.
- **Observability: `/health` + `/ready` always on, OpenTelemetry off.** The endpoints are needed for the Docker healthcheck and PM2 readiness. OTel adds several packages and a collector to configure, so it stays opt-in (and is in `full`).
- **Package manager fallback: pnpm if installed, else npm.** It's detected from the invoking `npm create` / `pnpm create` user agent. When detection fails (e.g. a bare `npx create-prodforge`), we use pnpm if it's on PATH, to match the e2e matrix, and otherwise npm with a one-line notice. *Tradeoff:* the lockfile type can surprise someone who ran it with npx, so `--pm` overrides it.
- **Runtime: Node 24 LTS default, Node 22 allowed.** Node 22 is supported until April 2027. The generated `engines` field and `.nvmrc` follow the choice.

### Presets that follow from the above

| | minimal | api (= `--yes`) | full |
|---|---|---|---|
| Framework | Express | Express | Express |
| DB | none | Prisma + Postgres | Prisma + Postgres |
| Example module | off | on | on |
| OpenAPI | off | on | on |
| Docker / PM2 / CI | Docker only | all on | all on |
| Git hooks | off | on | on |
| Redis/BullMQ, Auth, OTel | off | off | Redis + BullMQ, Better Auth, OTel |

## 2026-10-10 · Phase 1 core engine

- **`versions.ts` holds exact versions; the generated `package.json` gets caret ranges.** Exact pins keep the e2e matrix meaningful (we test what's in the file), and `^` lets users pick up patches after generation. Renovate reads the file through a regex custom manager in `renovate.json`, so entries must stay one `'name': 'x.y.z',` per line. Prettier's `quoteProps: "consistent"` keeps every key quoted so the regex matches.
- **`dependsOn` is ordering only.** A feature runs after the listed features *if they're enabled*; a disabled one is skipped, not an error. An id no registered feature has *is* an error, to catch typos. Ties keep registry order so output is deterministic.
- **`conflictsWith` is checked in both directions** among enabled features, so only one side needs to declare it.
- **Features get an optional `finalize()` hook** that runs after every `apply()`. It lets a feature consume what others registered (the docker feature reading compose services, for example) without having to `dependsOn` every feature that might add one.
- **Slot injections are queued and applied after all features run**, so the file can be written by a feature that runs later. Code is indented to the marker, multiple injections keep their order, and every marker line is removed at the end, including unfilled ones. Injecting into a missing slot or file throws with the available slot names.
- **Conflicts throw instead of last-write-wins.** Two features adding the same dependency, script or env var with different values is a bug in one of them, so the pipeline stops and names both values.
- **A package in both `dependencies` and `devDependencies` stays only in `dependencies`.**
- **eta renders with `autoEscape: false`** (we generate code, not HTML) **and no automatic trimming.** Auto-trim also ate the newline after a `<%= %>` at the end of a line, merging it with the next one. Control-flow tags opt in with `-%>` (`<% if (it.cfg.docker) { -%>`) so they leave no blank line.
- **Install and `git init` aren't in the pipeline yet.** Phase 1 stops at `writeProject()`; Phase 2 adds them along with the CLI wiring. How the bundled CLI finds each feature's `files/` directory after tsdown bundling is also left to Phase 2, when the first real feature exists.
- **`ProjectConfig.example` defaults from `db`** (on with a database, off without), matching the default-stack decision above.

## 2026-10-10 · Phase 2 minimal generator

- **Options without a feature yet are reported, not silently dropped.** `--yes` uses the `api` preset from the default-stack decision, which includes Prisma, Docker, PM2 and more that later phases build. The CLI prints one "Not available yet, so not generated: …" line for those and generates the rest. A framework or linter with no feature yet (`--framework hono`) is an error instead, because there's no sensible project without it. `src/cli/availability.ts` holds the list and shrinks phase by phase.
- **Prompts only ask what can be generated today:** project name, install, git. Framework, database and extras prompts arrive with their features, so nobody picks an option that does nothing.
- **Templates ship next to the bundle.** The build copies `src/features/*/files/` to `dist/features/*/files/`, and `featureFiles(id)` looks in both places, so the same code works from source (`pnpm dev`, tests) and from the published CLI.
- **`_name` in a template directory becomes `.name`.** npm drops `.gitignore` (and some other dotfiles) from published packages, so templates store `_gitignore`, `_prettierrc.json`, etc. Only a single leading underscore is converted, so `__tests__` stays as is.
- **Generated projects use `module: preserve` + `moduleResolution: bundler`**, same as this repo. tsx (dev), Vitest (tests) and tsdown (build) all resolve extensionless imports, so `import { createApp } from './app'` works everywhere and `node dist/server.js` runs the bundle.
- **`dev` and `start` load `.env` with Node's `--env-file-if-exists`.** No dotenv dependency. Typed env validation with Zod comes in Phase 3.
- **pnpm projects allow esbuild's build script** (`pnpm.onlyBuiltDependencies`), which pnpm 10 blocks by default and tsx needs.
- **The health check test lives in the framework feature**, not testing-vitest, because how a test drives the app (Supertest against an Express app vs. Fastify's `inject`) depends on the framework. testing-vitest owns the runner config and scripts.
- **The e2e test runs the built CLI**, installs real dependencies, and checks lint, format, typecheck, test and build, then boots `pnpm start` and `pnpm dev` and calls `/health`. It runs as its own CI job; the main job also smoke-tests that the bundle ships its templates.
- **Install failures stop the CLI with pnpm's output; a failed initial git commit doesn't.** The commit usually fails only because no git identity is configured, so the repository is left initialized with everything staged.

## 2026-10-10 · Phase 3 production essentials

- **Env is validated once, at startup, in `src/config/env.ts`.** A bad or missing variable prints Zod's readable error and exits before the server starts. Base owns the shared variables (NODE_ENV, PORT, LOG_LEVEL, SHUTDOWN_TIMEOUT_MS); each feature adds its own through the `env` slot, so the schema only lists what the project actually uses.
- **Pino for logs, pino-http for request logs.** JSON in production, pino-pretty only in development (it's a devDependency). Each request gets an id, reusing an incoming `x-request-id` so ids line up across services, and it's echoed in the response and in error bodies. `/health` and `/ready` aren't logged, since probes would drown everything else. Authorization and cookie headers are redacted.
- **One error shape for every failure:** `{ error: { message, details?, requestId } }`. `HttpError` sets its own status, a `ZodError` becomes 400 with flattened details, other errors become 500 with a generic message, and only 5xx are logged as errors.
- **`/health` is liveness, `/ready` is readiness.** `/health` only says the process is up. `/ready` runs the checks features push into `src/lib/readiness.ts` (a database ping in later phases) and returns 503 while shutting down, so a load balancer stops sending traffic before the server closes. Both sit before cors and the rate limiter so probes are never throttled.
- **Graceful shutdown** on SIGTERM/SIGINT: mark not-ready, stop accepting connections, run the `shutdown` slot (closing pools later), then exit; a timer forces exit after SHUTDOWN_TIMEOUT_MS. Crashes (`uncaughtException`, `unhandledRejection`) go through the same path with exit code 1.
- **Docker is generated only for pnpm and npm for now.** The Dockerfile installs from the lockfile, and yarn and bun need different setup, so they're reported as "not available yet" like other missing options. The image is multi-stage (build with all deps, ship prod deps and `dist` only), runs as the `node` user, and starts with `node` directly, not through a package manager, so SIGTERM reaches the app.
- **pnpm projects pin `packageManager`** to the version in `versions.ts`. Docker installs the same pnpm version, so the lockfile format always matches.
- **`compose.yaml` is built in `finalize()` with the `yaml` package**, from the services other features registered, with the app depending on each one being healthy. Strings use single quotes to match the generated Prettier config.
- **PM2 isn't a dependency of the generated project.** It's a process manager usually installed on the server (`npm i -g pm2`), so the feature ships `ecosystem.config.cjs` (cluster mode, one worker per CPU, waits for the app's `ready` signal) and README instructions. Its version in `versions.ts` is what the README and the e2e test use.
- **Slot markers can also be Markdown comments** (`<!-- @slot:docs -->`), so features add their own README sections.
- **Generated ESLint ignores unused names starting with `_`**, the usual way to mark a required but unused parameter such as Express's `next` in an error handler.
- **The e2e test also runs pm2 and `docker compose up --wait`** against the generated project. The Docker step can be skipped with `PRODFORGE_E2E_SKIP_DOCKER=1` on machines without a daemon; CI always runs it.
