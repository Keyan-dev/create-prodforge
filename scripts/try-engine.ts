/**
 * Run the core engine by hand with two toy features and print the generated files.
 * Nothing is written to disk. Usage: `pnpm try:engine [project-name]`
 */
import { parseConfig } from '../src/core/config';
import type { Feature } from '../src/core/feature';
import { generate } from '../src/core/pipeline';
import { pick } from '../src/core/versions';

const base: Feature = {
  id: 'base',
  label: 'Base',
  enabled: () => true,
  apply(ctx) {
    ctx.pkg
      .set('name', ctx.cfg.name)
      .set('type', 'module')
      .addScripts({ dev: 'tsx watch src/app.ts' })
      .addDeps(pick('express'));
    ctx.env.add('PORT', '3000', 'HTTP port');
    ctx.files.render(
      'src/app.ts',
      [
        '// <%= it.cfg.name %>',
        "import express from 'express';",
        '// @slot:imports',
        '',
        'const app = express();',
        '// @slot:middleware',
        '<% if (it.cfg.openapi) { -%>',
        "app.get('/docs', serveDocs);",
        '<% } -%>',
        '',
      ].join('\n'),
    );
  },
};

// Listed before `base` on purpose: dependsOn makes it run after.
const helmet: Feature = {
  id: 'helmet',
  label: 'Helmet',
  enabled: () => true,
  dependsOn: ['base'],
  apply(ctx) {
    ctx.pkg.addDeps(pick('helmet'));
    ctx.inject('src/app.ts', 'imports', "import helmet from 'helmet';");
    ctx.inject('src/app.ts', 'middleware', 'app.use(helmet());');
  },
};

const cfg = parseConfig({ name: process.argv[2] ?? 'my-api' });
const { files, features } = await generate(cfg, [helmet, base]);

console.log(`features ran: ${features.join(' → ')}`);
for (const [path, file] of files.entries()) console.log(`\n── ${path}\n${file.content}`);
