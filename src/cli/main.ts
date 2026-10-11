import * as p from '@clack/prompts';
import { defineCommand } from 'citty';
import { z } from 'zod';
import pkg from '../../package.json' with { type: 'json' };
import { add } from './add';
import { args } from './args';
import { create } from './create';
import { CancelledError } from './prompts';

function fail(error: unknown) {
  if (error instanceof CancelledError) {
    p.cancel('Cancelled.');
  } else if (error instanceof z.ZodError) {
    p.cancel(`Invalid options:\n${z.prettifyError(error)}`);
  } else {
    p.cancel(error instanceof Error ? error.message : String(error));
  }
  process.exitCode = 1;
}

/** `create-prodforge add <add-on...>`: turn on options in an existing project. */
export const addCommand = defineCommand({
  meta: {
    name: 'create-prodforge add',
    version: pkg.version,
    description:
      'Add options to a project made by create-prodforge: redis, bullmq, jwt, better-auth, otel, openapi, docker, pm2, ci, git-hooks, example.',
  },
  args: {
    'install': {
      type: 'boolean',
      default: true,
      description: 'Install dependencies',
      negativeDescription: "Don't install dependencies",
    },
    'dry-run': { type: 'boolean', description: 'Show what would change, without writing' },
  },
  async run({ args: parsed }) {
    try {
      await add(parsed._.map(String), {
        cwd: process.cwd(),
        install: parsed.install,
        dryRun: Boolean(parsed['dry-run']),
        version: pkg.version,
      });
    } catch (error) {
      fail(error);
    }
  },
});

export const main = defineCommand({
  meta: {
    name: 'create-prodforge',
    version: pkg.version,
    description: pkg.description,
  },
  args,
  async run({ args: parsed }) {
    try {
      await create(parsed, {
        cwd: process.cwd(),
        interactive: !parsed.yes && Boolean(process.stdin.isTTY),
        force: Boolean(parsed.force),
        version: pkg.version,
        dryRun: Boolean(parsed['dry-run']),
        latest: Boolean(parsed.latest),
      });
    } catch (error) {
      fail(error);
    }
  },
});
