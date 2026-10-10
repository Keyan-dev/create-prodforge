import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/snapshots/**/*.test.ts'],
    coverage: { provider: 'v8', include: ['src/**'] },
  },
});
