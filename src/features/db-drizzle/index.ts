import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GeneratorContext } from '../../core/context';
import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { connectOnStartup, readmeSetup, runScript, usePostgres } from '../shared/database';

interface JournalEntry {
  idx: number;
  version: '7';
  when: number;
  tag: string;
  breakpoints: true;
}

/** drizzle-kit's migration journal. `drizzle-kit migrate` fails without one, even if empty. */
function journal(entries: JournalEntry[]) {
  return `${JSON.stringify({ version: '7', dialect: 'postgresql', entries }, null, 2)}\n`;
}

/**
 * The auth tables' migration, numbered after the users migration when the example is on. Each
 * auth option ships its SQL and the drizzle-kit snapshot for both positions (the snapshot
 * includes every table so far and points at the previous one), so later `db:generate` runs diff
 * against the right state.
 */
async function writeAuthMigration(ctx: GeneratorContext, auth: string, idx: number) {
  const dir = featureFiles('db-drizzle', `files-auth-${auth}-migration`);
  const tag = `${String(idx).padStart(4, '0')}_auth`;
  const snapshot = idx === 0 ? 'snapshot-alone.json' : 'snapshot-after-users.json';
  ctx.files.write(`drizzle/${tag}.sql`, await readFile(join(dir, 'auth.sql'), 'utf8'));
  ctx.files.write(
    `drizzle/meta/${tag.slice(0, 4)}_snapshot.json`,
    await readFile(join(dir, snapshot), 'utf8'),
  );
  return { idx, version: '7', when: 1791703413409, tag, breakpoints: true } as const;
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
    const entries: JournalEntry[] = [];
    if (cfg.example) {
      await ctx.files.copyDir(featureFiles('db-drizzle', 'files-example'));
      entries.push({
        idx: 0,
        version: '7',
        when: 1791661440873,
        tag: '0000_init',
        breakpoints: true,
      });
    }
    if (cfg.auth !== 'none') {
      await ctx.files.copyDir(featureFiles('db-drizzle', `files-auth-${cfg.auth}`));
      entries.push(await writeAuthMigration(ctx, cfg.auth, entries.length));
    }
    // Written here rather than copied: a template named `_journal.json` would become a dotfile.
    ctx.files.write('drizzle/meta/_journal.json', journal(entries));

    // drizzle-kit writes its snapshots as tab-indented JSON; leave generated files alone.
    ctx.inject('.prettierignore', 'ignore', 'drizzle/', { optional: true });
    ctx.inject('biome.jsonc', 'ignore', '"!drizzle",', { optional: true });
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
