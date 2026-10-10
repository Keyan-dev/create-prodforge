# create-prodforge — Build Plan

> A CLI that generates production-ready Node.js + TypeScript backends, with only the pieces you pick.
>
> ```bash
> npm create prodforge@latest my-api
> pnpm create prodforge my-api --preset full --yes
> ```

---

## 1. Goals

| Goal | What it means in practice |
|---|---|
| **Production-ready out of the box** | Every project it generates installs, lints, type-checks, tests, builds, and runs in Docker or PM2 with no manual fixes. |
| **Customizable** | Interactive prompts *or* CLI flags *or* a saved preset file, all producing the same result. |
| **Latest packages, but safe** | Versions are pinned in one `versions.ts` file. Renovate bumps them, and CI regenerates every feature combination to prove they still work. `--latest` opts into resolving from npm at generation time. |
| **Composable** | Each feature (Docker, PM2, Prisma, …) is a self-contained module. Adding a feature never means editing another one. |
| **Vibe-codable** | Small, isolated modules with clear contracts, so each phase below fits in one AI session. |

**Non-goals for v1:** frontend frameworks (Next/React), monorepos, serverless targets. These are candidates for v2 (§9).

---

## 2. What it generates (feature menu)

Defaults are marked ★.

| Category | Options |
|---|---|
| Runtime | Node 22 LTS / ★ Node 24 LTS |
| Package manager | ★ pnpm / npm / yarn / bun (auto-detected from the invoking `npm create`) |
| Framework | ★ Express 5 / Fastify 5 / Hono |
| Language setup | TypeScript (strict), ESM, path aliases, `tsx` for dev, `tsdown` for build |
| Validation | ★ Zod 4 (request validation + typed env) |
| Database / ORM | none / ★ Prisma + PostgreSQL / Drizzle + PostgreSQL / Mongoose + MongoDB |
| Cache / queue | none / Redis (ioredis) / Redis + BullMQ workers |
| Auth | none / JWT (access + refresh) / Better Auth |
| Logging | ★ Pino (pretty in dev, JSON in prod) with request IDs |
| Security | ★ helmet, CORS, rate limiting, body-size limits |
| API docs | none / ★ OpenAPI generated from Zod schemas + Scalar UI |
| Observability | ★ `/health` + `/ready` endpoints / optional OpenTelemetry |
| Testing | ★ Vitest + Supertest, coverage via v8 |
| Lint / format | ★ ESLint (flat config) + Prettier / Biome |
| Git hooks | ★ Husky + lint-staged + commitlint (conventional commits) |
| Docker | ★ multi-stage Dockerfile (non-root, distroless/alpine), `.dockerignore`, `compose.yaml` with DB/Redis services |
| PM2 | ★ `ecosystem.config.cjs` (cluster mode, env blocks, log rotation hints) |
| CI | ★ GitHub Actions (lint → typecheck → test → build → docker build) / none |
| Extras | `.editorconfig`, `.nvmrc`, `.env.example`, graceful shutdown, central error handler, README for the project it generates |

### Generated project layout (Express + Prisma example)
```
my-api/
├─ src/
│  ├─ app.ts              # app factory (testable, no listen)
│  ├─ server.ts           # listen + graceful shutdown
│  ├─ config/env.ts       # zod-validated env
│  ├─ lib/logger.ts
│  ├─ middleware/         # error handler, request id, validate()
│  ├─ modules/health/     # route + controller + test
│  └─ modules/users/      # example CRUD module (optional)
├─ prisma/schema.prisma
├─ tests/
├─ Dockerfile  compose.yaml  .dockerignore
├─ ecosystem.config.cjs
├─ .github/workflows/ci.yml
├─ eslint.config.js  tsconfig.json  vitest.config.ts
└─ package.json  .env.example  README.md
```

---

## 3. CLI UX

```
◆ Project name › my-api
◆ Framework › Express 5
◆ Database › Prisma + PostgreSQL
◆ Extras › [x] Docker [x] PM2 [x] CI [x] OpenAPI [ ] Redis [ ] Auth
◆ Install dependencies? › Yes
◆ Initialize git? › Yes
└ Done! cd my-api && pnpm dev
```

- **Flags** mirror every prompt: `--framework fastify --db drizzle --no-pm2 --yes`
- **Presets:** `--preset minimal|api|full`, or `--preset ./my-preset.json`
- **`--dry-run`** prints the file tree and package.json diff without writing anything
- **`--latest`** resolves dependency versions from npm instead of using the pinned ones
- Fails safely if the target directory isn't empty (unless `--force`)

---

## 4. Architecture of the generator

```
create-prodforge/
├─ src/
│  ├─ index.ts              # bin entry
│  ├─ cli/
│  │  ├─ args.ts            # flag parsing (citty)
│  │  ├─ prompts.ts         # @clack/prompts flow
│  │  └─ presets.ts
│  ├─ core/
│  │  ├─ config.ts          # ProjectConfig zod schema = single source of truth
│  │  ├─ context.ts         # GeneratorContext (virtual file system + pkg.json builder)
│  │  ├─ vfs.ts             # in-memory files → flushed to disk at the end
│  │  ├─ package-json.ts    # merge deps/scripts, sort keys
│  │  ├─ render.ts          # template rendering (eta) + conditional blocks
│  │  ├─ versions.ts        # pinned versions for every dependency (Renovate-managed)
│  │  └─ pipeline.ts        # resolve features → order → apply → write → install → git
│  ├─ features/
│  │  ├─ base/              # tsconfig, src skeleton, env, logger
│  │  ├─ framework-express/
│  │  ├─ framework-fastify/
│  │  ├─ framework-hono/
│  │  ├─ db-prisma/
│  │  ├─ db-drizzle/
│  │  ├─ db-mongoose/
│  │  ├─ docker/
│  │  ├─ pm2/
│  │  ├─ ci-github/
│  │  ├─ lint-eslint/  lint-biome/
│  │  ├─ testing-vitest/
│  │  └─ …
│  └─ utils/ (pm detection, exec, fs)
├─ templates/ → co-located inside each feature as `files/`
└─ tests/
   ├─ unit/
   ├─ snapshots/            # file-tree + key-file snapshots per preset
   └─ e2e/                  # generate → install → lint → test → build
```

### Feature contract (the main abstraction)
```ts
export interface Feature {
  id: string;                                  // 'docker'
  label: string;
  enabled(cfg: ProjectConfig): boolean;        // when this feature applies
  dependsOn?: string[];                        // ordering
  conflictsWith?: string[];
  apply(ctx: GeneratorContext): void | Promise<void>;
}

// inside apply():
ctx.files.copyDir('files/');                   // template dir, rendered with cfg
ctx.pkg.addDeps({ helmet: v.helmet });
ctx.pkg.addDevDeps({ ... });
ctx.pkg.addScripts({ 'docker:build': '...' });
ctx.env.add('DATABASE_URL', 'postgresql://...', 'Postgres connection');
ctx.compose.addService('postgres', {...});     // docker feature consumes this
ctx.inject('src/app.ts', 'middleware', code);  // named injection slots
```
Features write to a **virtual filesystem**, and nothing reaches disk until the whole pipeline succeeds. That's what makes `--dry-run` and snapshot tests cheap.

**Injection slots:** base templates contain markers like `// @slot:imports` and `// @slot:middleware`. Features push code into those slots, so the db feature never has to know which framework file it's editing.

### Tech for the CLI itself
TypeScript · tsdown (bundle to one ESM file) · citty (args) · @clack/prompts · eta (templates) · picocolors · nypm or tinyexec (install) · Vitest · changesets (releases).

---

## 5. Versioning strategy ("latest packages")

1. `src/core/versions.ts` is the **only** place a version string lives.
2. **Renovate** opens PRs weekly to bump it.
3. CI runs the **e2e matrix** on every PR (§6). A bump only merges if every generated combination passes.
4. Users can pass `--latest` to resolve from the npm registry at generation time (with a warning that it isn't verified).

---

## 6. Quality gates

| Layer | What's tested |
|---|---|
| Unit | config schema, pkg.json merging, slot injection, feature resolution/conflicts |
| Snapshot | generated file tree + key files for each preset (fast, no install) |
| E2E matrix (CI) | for each combination of {framework} × {db} × {lint} plus presets: generate → install → `lint` → `typecheck` → `test` → `build` → `docker build` → boot container and hit `/health` |
| Smoke | `npm pack` the CLI and run it through `npx` in a temp dir |

Every row in the E2E matrix must pass before a release.

---

## 7. Roadmap (vibe-coding phases)

Each phase is one or two AI sessions. **Done when** describes the acceptance check.

### Phase 0 — Repo bootstrap
- pnpm, TS strict, tsdown, Vitest, ESLint/Prettier, changesets, GitHub Actions for the CLI repo itself
- `bin` entry that prints a version
- **Done when:** `pnpm build && node dist/index.js --version` works and CI is green

### Phase 1 — Core engine
- `ProjectConfig` zod schema, VFS, package.json builder, eta renderer, slot injection, pipeline, `versions.ts`
- **Done when:** unit tests cover merging, injection, and feature ordering/conflicts

### Phase 2 — Minimal working generator
- `base` + `framework-express` + `testing-vitest` + `lint-eslint`
- Prompts + flags + `--yes`, install deps, git init
- **Done when:** `create-prodforge my-api --yes` produces a project where `pnpm dev`, `test`, `lint`, and `build` all pass

### Phase 3 — Production essentials
- Pino logging, zod env, error handler, graceful shutdown, health/ready, helmet/cors/rate-limit
- `docker` (multi-stage + compose) and `pm2`
- **Done when:** `docker compose up` serves `/health`, and `pm2 start ecosystem.config.cjs` runs in cluster mode

### Phase 4 — Databases
- Prisma, Drizzle, Mongoose; compose services and env vars wired automatically; example `users` module
- **Done when:** each DB option passes e2e, including migrations against the compose DB

### Phase 5 — More frameworks and options
- Fastify, Hono; Biome alternative; Husky/commitlint; GitHub Actions CI template; OpenAPI + Scalar
- **Done when:** the full e2e matrix is green

### Phase 6 — Advanced options
- Redis / BullMQ, JWT / Better Auth, OpenTelemetry
- Presets (`minimal`, `api`, `full`, custom JSON), `--dry-run`, `--latest`

### Phase 7 — Polish and release
- README with GIF, docs site (optional), Renovate config, changesets release workflow, publish `create-prodforge@0.1.0`
- **Done when:** `npm create prodforge@latest` works from the public registry

### Phase 8 (post-v1) — `prodforge add <feature>`
- Add features to an existing generated project by re-running the feature modules against the real FS, using a `.prodforge.json` that records the original config

---

## 8. Vibe-coding workflow

1. Start each session with: *"Read PLAN.md and CLAUDE.md, then do Phase N."*
2. Work on a branch per phase (`phase-2-minimal-generator`) and merge once its **Done when** check passes.
3. After each phase, tick the checkbox below and note any decisions in `docs/decisions.md`.
4. Never hand-edit generated output to make a test pass. Fix the feature module instead.

### Progress
- [x] Phase 0 — Repo bootstrap
- [ ] Phase 1 — Core engine
- [ ] Phase 2 — Minimal working generator
- [ ] Phase 3 — Production essentials (Docker, PM2)
- [ ] Phase 4 — Databases
- [ ] Phase 5 — More frameworks and options
- [ ] Phase 6 — Advanced options
- [ ] Phase 7 — Polish and release

---

## 9. Future ideas (v2+)
- Frontend options: Next.js, React + Vite
- Monorepo mode (Turborepo with an `apps/api` + `apps/web` split)
- Deploy targets: Fly.io, Railway, Render, k8s manifests/Helm
- Web UI configurator that outputs a `npm create` command
- Plugin API so the community can publish `prodforge-feature-*` packages

## 10. Open questions
- Final package name (`create-prodforge` is available on npm as of 2026-10-10)
- Should the generated project include an example CRUD module by default, or keep it opt-in?
- Distroless vs alpine as the default Docker base image
