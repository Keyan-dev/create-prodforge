import { execFileSync } from 'node:child_process';
import { x } from 'tinyexec';

/** Whether `command --version` runs. */
export function commandExists(command: string): boolean {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
    return true;
  } catch {
    return false;
  }
}

/** Run a command in `cwd`, returning combined output. Throws with that output on failure. */
export async function run(command: string, args: string[], cwd: string): Promise<string> {
  const result = await x(command, args, {
    nodeOptions: { cwd, shell: process.platform === 'win32' },
    throwOnError: false,
  });
  const output = `${result.stdout}${result.stderr}`;
  if (result.exitCode !== 0) {
    throw new Error(
      `\`${command} ${args.join(' ')}\` failed (exit ${result.exitCode}):\n${output}`,
    );
  }
  return output;
}
