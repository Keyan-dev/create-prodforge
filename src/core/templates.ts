import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Absolute path of a feature's template directory: `files/` by default, or another one such as
 * `files-example/` for files a feature only adds under some option.
 *
 * From source this module sits in `src/core/`, next to `src/features/`. In the published CLI
 * everything is bundled into `dist/index.js`, and the build copies each `files/` directory to
 * `dist/features/<id>/files/` (see tsdown.config.ts), so both layouts are checked.
 */
export function featureFiles(id: string, dir = 'files'): string {
  const candidates = [
    join(import.meta.dirname, 'features', id, dir),
    join(import.meta.dirname, '..', 'features', id, dir),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found)
    throw new Error(
      `Templates ${dir}/ for feature "${id}" not found in ${candidates.join(' or ')}`,
    );
  return found;
}
