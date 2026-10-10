import { describe, expect, it } from 'vitest';
import { applySlots, findSlots } from '../../../src/core/slots';

const app = [
  "import express from 'express';",
  '// @slot:imports',
  '',
  'export function createApp() {',
  '  const app = express();',
  '  // @slot:middleware',
  '  return app;',
  '}',
].join('\n');

describe('slots', () => {
  it('finds slot markers', () => {
    expect(findSlots(app)).toEqual(['imports', 'middleware']);
    expect(findSlots('services:\n  # @slot:services\n')).toEqual(['services']);
  });

  it('injects code at the marker, matching its indentation, in injection order', () => {
    const result = applySlots('src/app.ts', app, [
      { path: 'src/app.ts', slot: 'middleware', code: 'app.use(helmet());' },
      { path: 'src/app.ts', slot: 'imports', code: "import helmet from 'helmet';" },
      {
        path: 'src/app.ts',
        slot: 'middleware',
        code: 'app.use(cors());\napp.use(express.json());\n',
      },
    ]);

    expect(result).toBe(
      [
        "import express from 'express';",
        "import helmet from 'helmet';",
        '',
        'export function createApp() {',
        '  const app = express();',
        '  app.use(helmet());',
        '  app.use(cors());',
        '  app.use(express.json());',
        '  return app;',
        '}',
      ].join('\n'),
    );
  });

  it('removes markers that nobody filled', () => {
    expect(applySlots('src/app.ts', app, [])).not.toContain('@slot');
  });

  it("doesn't indent blank lines inside injected code", () => {
    const result = applySlots('a.ts', '  // @slot:x', [
      { path: 'a.ts', slot: 'x', code: 'a();\n\nb();' },
    ]);
    expect(result).toBe('  a();\n\n  b();');
  });

  it('throws when the slot does not exist', () => {
    expect(() =>
      applySlots('src/app.ts', app, [{ path: 'src/app.ts', slot: 'routes', code: 'x' }]),
    ).toThrow(/No slot "@slot:routes" in src\/app.ts \(has: imports, middleware\)/);
  });

  it('only treats whole-line comments as markers', () => {
    expect(findSlots("const s = '// @slot:nope';")).toEqual([]);
  });
});
