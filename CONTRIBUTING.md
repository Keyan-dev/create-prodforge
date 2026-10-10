# Contributing

1. Read [PLAN.md](./PLAN.md) for architecture and roadmap.
2. `pnpm install`, then `pnpm dev -- my-app` to run the CLI from source.
3. New features go in `src/features/<id>/` and implement the `Feature` interface.
4. Run `pnpm test` (and `pnpm test:e2e` for generator changes) before opening a PR.
5. Use conventional commits (`feat:`, `fix:`, `chore:`…).
