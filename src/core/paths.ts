import { posix } from 'node:path';

/**
 * Normalize a project-relative path to posix form. Rejects absolute paths and anything that
 * escapes the project root, so no feature can write outside the target directory.
 */
export function normalizePath(path: string): string {
  const unix = path.replaceAll('\\', '/');
  if (unix.startsWith('/') || /^[a-zA-Z]:/.test(unix)) {
    throw new Error(`Path must be relative to the project root: ${path}`);
  }
  const normalized = posix.normalize(unix).replace(/\/$/, '');
  if (
    normalized === '.' ||
    normalized === '' ||
    normalized.startsWith('../') ||
    normalized === '..'
  ) {
    throw new Error(`Path escapes the project root: ${path}`);
  }
  return normalized;
}
