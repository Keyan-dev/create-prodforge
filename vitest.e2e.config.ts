import { defineConfig } from 'vitest/config';

// Slow generate → install → build matrix (PLAN.md §6). Populated from Phase 2 on.
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 300_000,
  },
});
