import { basename, relative, resolve } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseConfig, type ProjectConfig, type ProjectConfigInput } from '../core/config';
import { generate, writeProject } from '../core/pipeline';
import { features } from '../features';
import { commandExists, run } from '../utils/exec';
import { detectPackageManager, runCommand } from '../utils/pm';
import { argsToConfig } from './args';
import { unavailable } from './availability';
import { promptForMissing } from './prompts';

export interface CreateOptions {
  cwd: string;
  /** Ask for missing answers. Off with `--yes` or when stdin isn't a terminal. */
  interactive: boolean;
  force: boolean;
}

/** Resolve the config from flags (and prompts), generate the project, then install and git init. */
export async function create(parsedArgs: Record<string, unknown>, options: CreateOptions) {
  p.intro(pc.bold('create-prodforge'));

  let input = argsToConfig(parsedArgs);
  input.packageManager ??= detectPackageManager(process.env.npm_config_user_agent, () =>
    commandExists('pnpm'),
  );
  input = options.interactive ? await promptForMissing(input) : { name: 'my-api', ...input };
  const cfg = parseConfig(input as ProjectConfigInput);

  const { blocking, skipped } = unavailable(cfg);
  if (blocking.length) {
    throw new Error(`Not available yet: ${blocking.join(', ')}. See PLAN.md for the roadmap.`);
  }
  if (skipped.length) {
    p.log.warn(`Not available yet, so not generated: ${skipped.join(', ')}.`);
  }

  // A scoped name like @acme/api goes in ./api.
  const dir = resolve(options.cwd, basename(cfg.name));
  const { files } = await generate(cfg, features);
  await writeProject(files, dir, { force: options.force });
  const shownDir = relative(options.cwd, dir) || '.';
  p.log.success(`Created ${files.paths().length} files in ${pc.cyan(shownDir)}`);

  // git init comes first so the install's `prepare` script can set up the git hooks.
  const hasGit = cfg.git && (await gitInit(dir));
  if (cfg.install) await install(cfg, dir);
  if (hasGit) await initialCommit(dir);

  const steps = [
    `cd ${shownDir}`,
    !cfg.install && `${cfg.packageManager} install`,
    runCommand(cfg.packageManager, 'dev'),
  ].filter(Boolean);
  p.outro(`Done! Next:\n   ${steps.join('\n   ')}`);
}

async function install(cfg: ProjectConfig, dir: string) {
  if (!commandExists(cfg.packageManager)) {
    p.log.warn(`${cfg.packageManager} isn't installed, so dependencies weren't installed.`);
    return;
  }
  const spinner = p.spinner();
  spinner.start(`Installing dependencies with ${cfg.packageManager}`);
  try {
    await run(cfg.packageManager, ['install'], dir);
    spinner.stop('Installed dependencies');
  } catch (error) {
    spinner.error('Installing dependencies failed');
    throw error;
  }
}

async function gitInit(dir: string): Promise<boolean> {
  if (!commandExists('git')) {
    p.log.warn("git isn't installed, so no repository was created.");
    return false;
  }
  await run('git', ['init', '--quiet'], dir);
  return true;
}

async function initialCommit(dir: string) {
  await run('git', ['add', '--all'], dir);
  try {
    // --no-verify: the generated files are already linted and formatted, so skip the hooks.
    await run(
      'git',
      [
        'commit',
        '--quiet',
        '--no-verify',
        '--message',
        'chore: initial commit from create-prodforge',
      ],
      dir,
    );
    p.log.success('Initialized a git repository');
  } catch {
    // Usually no git user.name/email configured. The files are staged; leave the commit to them.
    p.log.info(
      'Initialized a git repository. The initial commit was skipped, so commit when ready.',
    );
  }
}
