import { stringify } from 'yaml';
import type { ProjectConfig } from '../../core/config';
import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { versions } from '../../core/versions';

/** Lockfile and commands per package manager, used by the Dockerfile template. */
const PACKAGE_MANAGERS = {
  pnpm: {
    setup: `npm install --global pnpm@${versions.pnpm}`,
    lockfile: 'pnpm-lock.yaml',
    install: 'pnpm install --frozen-lockfile',
    installProd: 'pnpm install --frozen-lockfile --prod',
    build: 'pnpm build',
  },
  npm: {
    setup: '',
    lockfile: 'package-lock.json',
    install: 'npm ci',
    installProd: 'npm ci --omit=dev',
    build: 'npm run build',
  },
} as const;

/** Docker support covers pnpm and npm for now; yarn and bun are listed as not available yet. */
export function dockerSupports(pm: ProjectConfig['packageManager']): pm is 'pnpm' | 'npm' {
  return pm in PACKAGE_MANAGERS;
}

/**
 * Multi-stage Dockerfile (node:alpine, non-root user, healthcheck), .dockerignore and
 * compose.yaml. Other features add compose services (Postgres, Redis, …) through
 * `ctx.compose`; compose.yaml is written in `finalize()` so it sees all of them.
 */
export const docker: Feature = {
  id: 'docker',
  label: 'Docker',
  enabled: (cfg) => cfg.docker && dockerSupports(cfg.packageManager),
  dependsOn: ['base'],
  async apply(ctx) {
    const pm = ctx.cfg.packageManager as keyof typeof PACKAGE_MANAGERS;
    await ctx.files.copyDir(featureFiles('docker'), '.', { pm: PACKAGE_MANAGERS[pm] });
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Docker',
        '',
        '```bash',
        'docker compose up --build',
        '```',
        '',
        'The image is a multi-stage build on `node:alpine` that runs as the non-root `node` user, with a `HEALTHCHECK` on `/health`. Commit your lockfile first: the build installs from it.',
      ].join('\n'),
    );
  },
  finalize(ctx) {
    const services = ctx.compose.services();
    const app: Record<string, unknown> = {
      build: '.',
      ports: ['${PORT:-3000}:3000'],
      env_file: [{ path: '.env', required: false }],
      environment: { NODE_ENV: 'production', PORT: '3000' },
      restart: 'unless-stopped',
    };
    const names = Object.keys(services);
    if (names.length) {
      app.depends_on = Object.fromEntries(
        names.map((name) => [name, { condition: 'service_healthy' }]),
      );
    }
    ctx.files.write(
      'compose.yaml',
      stringify({ services: { app, ...services } }, { singleQuote: true }),
    );
  },
};
