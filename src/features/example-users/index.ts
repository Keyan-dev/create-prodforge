import type { Feature } from '../../core/feature';
import { featureFiles } from '../../core/templates';

/**
 * Example `users` CRUD module, shared part: Zod schemas, the `User` type and the
 * `UsersRepository` interface. The database feature implements the repository and the framework
 * feature adds the routes and tests, so this works with any combination of the two.
 */
export const exampleUsers: Feature = {
  id: 'example-users',
  label: 'Example users module',
  enabled: (cfg) => cfg.example && cfg.db !== 'none',
  dependsOn: ['base'],
  async apply(ctx) {
    await ctx.files.copyDir(featureFiles('example-users'));
    ctx.inject(
      'README.md',
      'docs',
      [
        '',
        '## Example users module',
        '',
        '`src/modules/users` is a small CRUD API that shows the database wiring end to end:',
        '',
        '- `GET /users?limit=20&offset=0`: list users',
        '- `POST /users`: create one from `{ "email", "name" }`',
        '- `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`',
        '',
        'Copy it as a starting point for your own modules. To remove it, delete `src/modules/users`, `tests/users.test.ts` and the `usersRouter` lines in `src/app.ts`.',
      ].join('\n'),
    );
  },
};
