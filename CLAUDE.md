# CLAUDE.md

This repo is **create-prodforge**, a CLI that scaffolds production-ready Node.js + TypeScript backends. The full plan and roadmap are in `PLAN.md`; read it first.

## Rules
- Package manager: **pnpm**. Node 24+. ESM only. TypeScript strict.
- Every dependency version used in *generated* projects lives in `src/core/versions.ts`. Never hardcode a version string anywhere else.
- Each feature lives in `src/features/<id>/` and implements the `Feature` interface. Features don't import each other. They talk through `GeneratorContext` (slots, env, compose, pkg).
- Features write to the virtual FS only. Disk writes happen once, at the end of the pipeline.
- Template files sit in `src/features/<id>/files/`. A file with a `.eta` suffix is rendered; anything else is copied as-is.
- Any new feature or option needs a snapshot test, and it must be added to the e2e matrix.
- Don't hand-edit generated output to pass a test. Fix the feature instead.

## Commands (once Phase 0 is done)
- `pnpm dev -- my-app` runs the CLI from source
- `pnpm test` runs unit and snapshot tests
- `pnpm test:e2e` runs the slow generate → install → build matrix
- `pnpm build` bundles with tsdown

## Workflow
- One branch per phase from PLAN.md §7. A phase is finished when its **Done when** check passes.
- Tick the progress checkbox in PLAN.md §8 when a phase merges.
- Record non-obvious decisions in `docs/decisions.md`.
