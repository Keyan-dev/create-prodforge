import * as p from '@clack/prompts';
import { defineCommand } from 'citty';
import { z } from 'zod';
import pkg from '../../package.json' with { type: 'json' };
import { args } from './args';
import { create } from './create';
import { CancelledError } from './prompts';

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
        dryRun: Boolean(parsed['dry-run']),
        latest: Boolean(parsed.latest),
      });
    } catch (error) {
      if (error instanceof CancelledError) {
        p.cancel('Cancelled.');
      } else if (error instanceof z.ZodError) {
        p.cancel(`Invalid options:\n${z.prettifyError(error)}`);
      } else {
        p.cancel(error instanceof Error ? error.message : String(error));
      }
      process.exitCode = 1;
    }
  },
});
