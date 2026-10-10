import { defineConfig } from 'vitest/config';

// Slow generate → install → build matrix (PLAN.md §6).
export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    passWithNoTests: true,
    testTimeout: 120_000,
    hookTimeout: 300_000,
    // One generated project, checked step by step.
    sequence: { concurrent: false },
  },
});
