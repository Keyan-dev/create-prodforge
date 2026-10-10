import { describe, expect, it } from 'vitest';
import { detectPackageManager, runCommand } from '../../../src/utils/pm';

describe('detectPackageManager', () => {
  it.each([
    ['pnpm/10.28.0 npm/? node/v24.1.0 linux x64', 'pnpm'],
    ['npm/11.0.0 node/v24.1.0 linux x64 workspaces/false', 'npm'],
    ['yarn/4.9.0 npm/? node/v24.1.0 linux x64', 'yarn'],
    ['bun/1.3.0 npm/? node/v24.1.0 linux x64', 'bun'],
  ])('reads %s', (agent, expected) => {
    expect(detectPackageManager(agent, () => false)).toBe(expected);
  });

  it('falls back to pnpm when installed, else npm', () => {
    expect(detectPackageManager(undefined, () => true)).toBe('pnpm');
    expect(detectPackageManager(undefined, () => false)).toBe('npm');
    expect(detectPackageManager('deno/2.0.0', () => false)).toBe('npm');
  });
});

describe('runCommand', () => {
  it('uses `npm run` only for npm', () => {
    expect(runCommand('npm', 'dev')).toBe('npm run dev');
    expect(runCommand('pnpm', 'dev')).toBe('pnpm dev');
    expect(runCommand('bun', 'dev')).toBe('bun dev');
  });
});
