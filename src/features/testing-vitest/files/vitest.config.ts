import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Tests run with the settings from .env.example (so required variables such as DATABASE_URL
// are set), quiet and in test mode. Values already in the environment win.
const example = existsSync('.env.example') ? parseEnv(readFileSync('.env.example', 'utf8')) : {};

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: { ...example, LOG_LEVEL: 'silent', ...process.env, NODE_ENV: 'test' },
    coverage: { provider: 'v8', include: ['src/**'] },
  },
});
