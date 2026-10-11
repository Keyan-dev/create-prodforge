import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { connectOnStartup, readmeSetup, runScript, usePostgres } from '../shared/database';

/**
 * Prisma 7 with the `pg` driver adapter on PostgreSQL: schema, migrations, a client that
 * registers a readiness check and disconnects on shutdown, a compose Postgres service, and the
 * users repository when the example module is on.
 */
export const dbPrisma: Feature = {
  id: 'db-prisma',
  label: 'Prisma + PostgreSQL',
  enabled: (cfg) => cfg.db === 'prisma',
  dependsOn: ['base'],
  async apply(ctx) {
    const { cfg } = ctx;
    ctx.pkg
      .addDeps(pick('@prisma/adapter-pg', '@prisma/client', 'pg'))
      .addDevDeps(pick('@types/pg', 'prisma'))
      .addScripts({
        // The client is generated into src/generated/prisma (gitignored) after every install.
        'postinstall': 'prisma generate',
        'db:generate': 'prisma generate',
        'db:migrate': 'prisma migrate dev',
        'db:deploy': 'prisma migrate deploy',
        'db:studio': 'prisma studio',
      });
    if (cfg.packageManager === 'pnpm') {
      // Prisma downloads its schema engine (used by migrate) in an install script.
      ctx.pkg.allowBuilds('@prisma/engines', 'prisma');
    }
    usePostgres(ctx);
    connectOnStartup(ctx);
    ctx.compose.setMigrateScript('db:deploy');

    await ctx.files.copyDir(featureFiles('db-prisma'), '.', { example: cfg.example });
    if (cfg.example) await ctx.files.copyDir(featureFiles('db-prisma', 'files-example'));

    ctx.inject('.gitignore', 'ignore', '/src/generated/');
    // The image generates its own client; a stale local one must not overwrite it.
    ctx.inject('.dockerignore', 'ignore', 'src/generated', { optional: true });
    // The install script runs `prisma generate`, which needs the schema and config.
    ctx.inject('Dockerfile', 'install-files', 'COPY prisma.config.ts ./\nCOPY prisma ./prisma', {
      optional: true,
    });
    const run = runScript(cfg);
    readmeSetup(ctx, 'postgres', 'db:deploy');
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Database',
        '',
        `Prisma with PostgreSQL. The schema is \`prisma/schema.prisma\`. After changing it, run \`${run} db:migrate\` to create and apply a migration (it asks for a name). The client is generated into \`src/generated/prisma\` on install; \`${run} db:generate\` regenerates it. \`${run} db:deploy\` applies pending migrations without creating new ones, which is what deploys and the compose \`migrate\` service run.`,
      ].join('\n'),
    );
  },
};
