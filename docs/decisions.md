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
