import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { parseConfig, type ProjectConfig, type ProjectConfigInput } from '../core/config';
import { MANIFEST_FILE, ManifestSchema, manifestFor } from '../core/manifest';
import { mergePackageJson, missingEnvLines } from '../core/merge';
import { generate } from '../core/pipeline';
import { features } from '../features';
import { commandExists, run } from '../utils/exec';
import { runCommand } from '../utils/pm';
import { unavailable } from './availability';

/** What `create-prodforge add <name>` turns on. */
export const ADDONS = {
  'redis': { cache: 'redis' },
  'bullmq': { cache: 'bullmq' },
  'jwt': { auth: 'jwt' },
  'better-auth': { auth: 'better-auth' },
  'otel': { otel: true },
  'openapi': { openapi: true },
  'docker': { docker: true },
  'pm2': { pm2: true },
  'ci': { ci: true },
  'git-hooks': { gitHooks: true },
  'example': { example: true },
} as const satisfies Record<string, Partial<ProjectConfigInput>>;

export type AddonName = keyof typeof ADDONS;

export const isAddon = (name: string): name is AddonName => Object.hasOwn(ADDONS, name);

/** The new config, or an error explaining why these add-ons can't be added to this one. */
export function withAddons(cfg: ProjectConfig, names: AddonName[]): ProjectConfig {
  const next: ProjectConfigInput = { ...cfg };
  for (const name of names) {
    const change: Partial<ProjectConfigInput> = ADDONS[name];
    if (change.auth && cfg.auth !== 'none' && cfg.auth !== change.auth) {
      throw new Error(`This project already uses ${cfg.auth} auth; switching isn't supported.`);
    }
    // bullmq includes redis, so adding redis to a bullmq project changes nothing.
    if (change.cache === 'redis' && next.cache === 'bullmq') continue;
    Object.assign(next, change);
  }
  const parsed = parseConfig(next);
  const skipped = unavailable(parsed).skipped;
  if (skipped.length) throw new Error(`Can't add ${skipped.join(', ')} to this project.`);
  return parsed;
}

export interface AddOptions {
  cwd: string;
  install: boolean;
  dryRun: boolean;
  version: string;
}

type Outcome = 'created' | 'updated' | 'merged' | 'conflict' | 'kept';

/**
 * Turn on options in a project made by create-prodforge. Generates the project in memory with
 * the recorded options and with the new ones, and applies the difference to the files on disk:
 * new files are created, files you haven't changed are replaced, and files you have changed are
 * merged three ways (package.json key by key, others with `git merge-file`).
 */
export async function add(names: string[], options: AddOptions) {
  p.intro(pc.bold('create-prodforge add'));

  const unknown = names.filter((name) => !isAddon(name));
  if (!names.length || unknown.length) {
    throw new Error(
      `${unknown.length ? `Unknown add-on: ${unknown.join(', ')}. ` : ''}Choose from: ${Object.keys(ADDONS).join(', ')}.`,
    );
  }

  const manifestPath = join(options.cwd, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `No ${MANIFEST_FILE} here. Run this in the root of a project made by create-prodforge.`,
    );
  }
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
  if (manifest.version !== options.version) {
    p.log.warn(
      `This project was made by create-prodforge ${manifest.version}, and this is ${options.version}. Templates may have changed in between, so expect more merges.`,
    );
  }

  const current = parseConfig({ ...manifest.config, install: false, git: false });
  const next = withAddons(current, names as AddonName[]);
  if (JSON.stringify(next) === JSON.stringify(current)) {
    p.outro(`Nothing to do: the project already has ${names.join(', ')}.`);
    return;
  }

  const [base, theirs] = await Promise.all([
    generate(current, features).then((result) => result.files),
    generate(next, features).then((result) => result.files),
  ]);

  const results: [string, Outcome][] = [];
  const writes: [string, string, boolean][] = [];
  for (const [path, file] of theirs.entries()) {
    const target = join(options.cwd, path);
    const ours = existsSync(target) ? await readFile(target, 'utf8') : undefined;
    const baseContent = base.has(path) ? base.read(path) : undefined;
    if (baseContent === file.content) continue;
    if (ours === undefined) {
      // Generated before but deleted since: respect that.
      if (baseContent !== undefined) continue;
      writes.push([path, file.content, Boolean(file.executable)]);
      results.push([path, 'created']);
    } else if (ours === file.content) {
      continue;
    } else if (ours === baseContent) {
      writes.push([path, file.content, Boolean(file.executable)]);
      results.push([path, 'updated']);
    } else if (path === 'package.json') {
      const merged = mergePackageJson(baseContent ?? '{}', ours, file.content);
      writes.push([path, merged.content, false]);
      results.push([path, merged.conflicts.length ? 'conflict' : 'merged']);
      for (const key of merged.conflicts) p.log.warn(`package.json: kept your ${key}`);
    } else {
      const merged = await mergeText(ours, baseContent ?? '', file.content);
      if (merged === undefined) {
        writes.push([`${path}.prodforge-new`, file.content, false]);
        results.push([path, 'kept']);
      } else {
        writes.push([path, merged.content, false]);
        results.push([path, merged.conflicts ? 'conflict' : 'merged']);
      }
    }
  }

  // New variables go into .env too, so the app starts without editing it by hand.
  const envPath = join(options.cwd, '.env');
  let envLines: string[] = [];
  if (theirs.has('.env.example') && existsSync(envPath)) {
    envLines = missingEnvLines(theirs.read('.env.example'), await readFile(envPath, 'utf8'));
  }

  report(results, envLines);
  if (options.dryRun) {
    p.outro('Dry run: nothing was written.');
    return;
  }

  for (const [path, content, executable] of writes) {
    const target = join(options.cwd, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
    if (executable) await chmod(target, 0o755);
  }
  if (envLines.length) {
    const env = await readFile(envPath, 'utf8');
    await writeFile(envPath, `${env}${env.endsWith('\n') ? '' : '\n'}${envLines.join('\n')}\n`);
  }
  await writeFile(manifestPath, manifestFor(next, options.version));

  const pm = next.packageManager;
  const depsChanged = results.some(([path]) => path === 'package.json');
  if (depsChanged && options.install && commandExists(pm)) {
    const spinner = p.spinner();
    spinner.start(`Installing dependencies with ${pm}`);
    try {
      // The lockfile is out of date now, which CI-mode installs refuse by default.
      const unfreeze = {
        pnpm: ['--no-frozen-lockfile'],
        yarn: ['--no-immutable'],
        npm: [],
        bun: [],
      };
      await run(pm, ['install', ...unfreeze[pm]], options.cwd);
      spinner.stop('Installed dependencies');
    } catch (error) {
      spinner.error('Installing dependencies failed');
      throw error;
    }
  }

  const conflicts = results.filter(([, outcome]) => outcome === 'conflict' || outcome === 'kept');
  // Auth on Prisma or Drizzle comes with a migration for its tables.
  const newMigration = next.auth !== current.auth && next.db !== 'mongoose';
  const steps = [
    depsChanged && !options.install && `${pm} install`,
    newMigration && runCommand(pm, 'db:deploy'),
    'Read the new sections in README.md',
  ].filter(Boolean);
  p.outro(
    conflicts.length
      ? `Added ${names.join(', ')}. Resolve the conflicts above (search for <<<<<<< or *.prodforge-new), then:\n   ${steps.join('\n   ')}`
      : `Added ${names.join(', ')}. Next:\n   ${steps.join('\n   ')}`,
  );
}

function report(results: [string, Outcome][], envLines: string[]) {
  const labels: Record<Outcome, string> = {
    created: pc.green('created '),
    updated: pc.cyan('updated '),
    merged: pc.cyan('merged  '),
    conflict: pc.yellow('conflict'),
    kept: pc.yellow('kept    '),
  };
  const lines = results.map(([path, outcome]) => {
    const note =
      outcome === 'conflict'
        ? ' (both changed it; see the conflict markers)'
        : outcome === 'kept'
          ? ` (yours is unchanged; the new version is in ${path}.prodforge-new)`
          : '';
    return `${labels[outcome]}  ${path}${note}`;
  });
  if (envLines.length) {
    lines.push(`${labels.updated}  .env (${envLines.length} new variables from .env.example)`);
  }
  p.log.message(lines.join('\n') || 'No file changes.');
}

/** `git merge-file` the three versions. undefined when git isn't available. */
async function mergeText(ours: string, base: string, theirs: string) {
  if (!commandExists('git')) return undefined;
  const dir = await mkdtemp(join(tmpdir(), 'prodforge-merge-'));
  try {
    const paths = ['yours', 'original', 'added'].map((name) => join(dir, name));
    await Promise.all(
      [ours, base, theirs].map((content, i) => writeFile(paths[i] as string, content)),
    );
    const labels = ['-L', 'yours', '-L', 'original', '-L', 'create-prodforge'];
    const result = spawnSync('git', ['merge-file', '-p', ...labels, ...paths], {
      encoding: 'utf8',
    });
    // Exit status is the number of conflicts; negative (or null) means it failed.
    if (result.status === null || result.status < 0) return undefined;
    return { content: result.stdout, conflicts: result.status };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
