---
'create-prodforge': minor
---

Add `--framework fastify` and `--framework hono`, `--lint biome`, git hooks (Husky, lint-staged, commitlint), a GitHub Actions CI workflow, and OpenAPI docs built from the Zod schemas with a Scalar page at `/docs`. The CLI now also asks for the framework, linter and extras. `BODY_LIMIT` is now `BODY_LIMIT_KB` in generated projects.
