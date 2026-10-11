# Contributing

1. Read [PLAN.md](./PLAN.md) for architecture and roadmap.
2. `pnpm install`, then `pnpm dev -- my-app` to run the CLI from source.
3. New features go in `src/features/<id>/` and implement the `Feature` interface.
4. Run `pnpm test` (and `pnpm test:e2e` for generator changes) before opening a PR.
5. Use conventional commits (`feat:`, `fix:`, `chore:`…).
6. Add a changeset (`pnpm changeset`) for anything users will notice in the CLI or the generated projects.

## Releasing

Releases are cut by a maintainer; nothing publishes on its own.

1. Each push to `main` updates a **Version Packages** PR (the `Release` workflow). It bumps `package.json` and writes `CHANGELOG.md` from the pending changesets. GitHub must allow Actions to create pull requests (Settings → Actions → General → Workflow permissions).
2. Merge that PR when you want to release.
3. Publish, either way:
   - **From GitHub (recommended):** run the `Publish` workflow from the Actions tab. Leave *dry-run* on first to see the checks and the packed tarball pass, then run it again with *dry-run* off. It needs an `NPM_TOKEN` repository secret (or npm trusted publishing set up for `publish.yml`), publishes with provenance and pushes the `vX.Y.Z` tag.
   - **From your machine:** `git pull`, `pnpm install`, `pnpm build`, `scripts/smoke-pack.sh`, then `pnpm changeset publish` (it runs `npm publish` and creates the git tag; push it with `git push --follow-tags`).
4. Check it from the registry: `npm create prodforge@latest my-api -- --yes --no-install`.

`scripts/smoke-pack.sh` packs the CLI as npm would, installs the tarball in an empty directory and generates every preset with it. CI runs it on every PR.
