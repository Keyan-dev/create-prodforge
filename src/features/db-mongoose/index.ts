import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';
import { pick } from '../../core/versions';
import { connectOnStartup, readmeSetup, useMongo } from '../shared/database';

/**
 * Mongoose on MongoDB: a connection opened at startup (with a readiness check, closed on
 * shutdown), a compose MongoDB service, and the users model and repository when the example
 * module is on. MongoDB has no schema migrations; indexes are built from the models.
 */
export const dbMongoose: Feature = {
  id: 'db-mongoose',
  label: 'Mongoose + MongoDB',
  enabled: (cfg) => cfg.db === 'mongoose',
  dependsOn: ['base'],
  async apply(ctx) {
    ctx.pkg.addDeps(pick('mongoose'));
    useMongo(ctx);
    connectOnStartup(ctx);

    await ctx.files.copyDir(featureFiles('db-mongoose'));
    if (ctx.cfg.example) await ctx.files.copyDir(featureFiles('db-mongoose', 'files-example'));

    readmeSetup(ctx, 'mongo');
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Database',
        '',
        'Mongoose with MongoDB. Models live next to their module (`src/modules/*/*.model.ts`). There are no migrations: collections are created on first write, and indexes are built from the models when the app connects.',
      ].join('\n'),
    );
  },
};
