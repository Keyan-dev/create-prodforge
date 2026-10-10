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
