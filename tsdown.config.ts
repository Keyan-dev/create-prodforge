import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node24',
  dts: false,
  clean: true,
  fixedExtension: false,
  // Bundle to a single file. citty stays external and is installed as a dependency.
  outDir: 'dist',
});
