import { cp } from 'node:fs/promises';
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  dts: false,
  clean: true,
  fixedExtension: false,
  // Bundle to a single file. Runtime dependencies stay external and are installed with the CLI.
  outDir: 'dist',
  // Ship each feature's template directories (`files/`, `files-example/`, …) next to the bundle (src/core/templates.ts finds them).
  async onSuccess() {
    await cp('src/features', 'dist/features', {
      recursive: true,
      filter: (source) => !/\.ts$/.test(source) || /\/files[\w-]*\//.test(source),
    });
  },
});
