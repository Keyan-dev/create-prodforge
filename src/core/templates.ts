import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Absolute path of a feature's `files/` template directory.
 *
 * From source this module sits in `src/core/`, next to `src/features/`. In the published CLI
 * everything is bundled into `dist/index.js`, and the build copies each `files/` directory to
 * `dist/features/<id>/files/` (see tsdown.config.ts), so both layouts are checked.
 */
export function featureFiles(id: string): string {
  const candidates = [
    join(import.meta.dirname, 'features', id, 'files'),
    join(import.meta.dirname, '..', 'features', id, 'files'),
  ];
  const found = candidates.find((dir) => existsSync(dir));
  if (!found)
    throw new Error(`Templates for feature "${id}" not found in ${candidates.join(' or ')}`);
  return found;
}
