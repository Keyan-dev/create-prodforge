import { HTTPException } from 'hono/http-exception';
import { createRouter } from '../../lib/hono';
import { usersRepository } from './users.repository';
import { CreateUserSchema, ListUsersSchema, UpdateUserSchema } from './users.schema';

const notFound = () => new HTTPException(404, { message: 'User not found' });

/** CRUD routes for users. Invalid input throws a ZodError, which the error handler sends as 400. */
export const usersRoutes = createRouter()
  .get('/', async (c) => c.json(await usersRepository.list(ListUsersSchema.parse(c.req.query()))))
  .post('/', async (c) => {
    const user = await usersRepository.create(CreateUserSchema.parse(await c.req.json()));
    c.header('location', `${c.req.path.replace(/\/$/, '')}/${user.id}`);
    return c.json(user, 201);
  })
  .get('/:id', async (c) => {
    const user = await usersRepository.findById(c.req.param('id'));
    if (!user) throw notFound();
    return c.json(user);
  })
  .patch('/:id', async (c) => {
    const data = UpdateUserSchema.parse(await c.req.json());
    const user = await usersRepository.update(c.req.param('id'), data);
    if (!user) throw notFound();
    return c.json(user);
  })
  .delete('/:id', async (c) => {
    if (!(await usersRepository.remove(c.req.param('id')))) throw notFound();
    return c.body(null, 204);
  });
