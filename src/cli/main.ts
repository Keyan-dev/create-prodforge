import { defineCommand } from 'citty';
import pkg from '../../package.json' with { type: 'json' };

export const main = defineCommand({
  meta: {
    name: 'create-prodforge',
    version: pkg.version,
    description: pkg.description,
  },
  run() {
    console.log(`create-prodforge v${pkg.version}. Project generation arrives in Phase 2.`);
  },
});
