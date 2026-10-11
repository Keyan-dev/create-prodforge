import { expect, it } from 'vitest';
import { formatTree } from '../../../src/cli/tree';

it('draws directories first, then files, each sorted', () => {
  expect(formatTree(['src/server.ts', 'package.json', 'src/lib/env.ts', 'README.md', 'src/app.ts']))
    .toBe(`├─ src/
│  ├─ lib/
│  │  └─ env.ts
│  ├─ app.ts
│  └─ server.ts
├─ README.md
└─ package.json`);
});
