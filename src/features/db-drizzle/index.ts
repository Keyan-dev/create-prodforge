import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { connectOnStartup, readmeSetup, runScript, usePostgres } from '../shared/database';

/**
 * drizzle-kit's migration journal. `drizzle-kit migrate` fails without one, so a project
 * without the example still gets an empty journal; the example lists its users migration.
 */
function journal(example: boolean) {
  const entries = example
    ? [{ idx: 0, version: '7', when: 1791661440873, tag: '0000_init', breakpoints: true }]
    : [];
  return `${JSON.stringify({ version: '7', dialect: 'postgresql', entries }, null, 2)}\n`;
}

/**
 * Drizzle ORM on PostgreSQL through node-postgres: schema in TypeScript, SQL migrations from
 * drizzle-kit, a pooled client that registers a readiness check and closes on shutdown, a
 * compose Postgres service, and the users repository when the example module is on.
 */
export const dbDrizzle: Feature = {
  id: 'db-drizzle',
  label: 'Drizzle + PostgreSQL',
  enabled: (cfg) => cfg.db === 'drizzle',
  dependsOn: ['base'],
  async apply(ctx) {
    const { cfg } = ctx;
    ctx.pkg
      .addDeps(pick('drizzle-orm', 'pg'))
      .addDevDeps(pick('@types/pg', 'drizzle-kit'))
      .addScripts({
        'db:generate': 'drizzle-kit generate',
        'db:migrate': 'drizzle-kit migrate',
        'db:deploy': 'drizzle-kit migrate',
        'db:studio': 'drizzle-kit studio',
      });
    usePostgres(ctx);
    connectOnStartup(ctx);
    ctx.compose.setMigrateScript('db:deploy');

    await ctx.files.copyDir(featureFiles('db-drizzle'), '.', { example: cfg.example });
    if (cfg.example) await ctx.files.copyDir(featureFiles('db-drizzle', 'files-example'));
    // Written here rather than copied: a template named `_journal.json` would become a dotfile.
    ctx.files.write('drizzle/meta/_journal.json', journal(cfg.example));

    // drizzle-kit writes its snapshots as tab-indented JSON; leave generated files alone.
    ctx.inject('.prettierignore', 'ignore', 'drizzle/', { optional: true });
    const run = runScript(cfg);
    readmeSetup(ctx, 'postgres', 'db:deploy');
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Database',
        '',
        `Drizzle ORM with PostgreSQL. Tables are defined in \`src/db/schema.ts\`. After changing it, run \`${run} db:generate\` to write a SQL migration to \`drizzle/\`, then \`${run} db:migrate\` to apply it. \`${run} db:deploy\` does the same as \`db:migrate\`; deploys and the compose \`migrate\` service use it.`,
      ].join('\n'),
    );
  },
};
