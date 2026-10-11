import type { FastifyPluginAsync } from 'fastify';
import { HttpError } from '../../middleware/error-handler';
import { usersRepository } from './users.repository';
import { CreateUserSchema, ListUsersSchema, UpdateUserSchema } from './users.schema';

/** CRUD routes for users. Invalid input throws a ZodError, which the error handler sends as 400. */
export const usersRoutes: FastifyPluginAsync = async (app) => {
  const notFound = () => new HttpError(404, 'User not found');

  app.get('/', async (request) => usersRepository.list(ListUsersSchema.parse(request.query)));

  app.post('/', async (request, reply) => {
    const user = await usersRepository.create(CreateUserSchema.parse(request.body));
    return reply.status(201).header('location', `${app.prefix}/${user.id}`).send(user);
  });

  app.get<{ Params: { id: string } }>('/:id', async (request) => {
    const user = await usersRepository.findById(request.params.id);
    if (!user) throw notFound();
    return user;
  });

  app.patch<{ Params: { id: string } }>('/:id', async (request) => {
    const data = UpdateUserSchema.parse(request.body ?? {});
    const user = await usersRepository.update(request.params.id, data);
    if (!user) throw notFound();
    return user;
  });

  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!(await usersRepository.remove(request.params.id))) throw notFound();
    return reply.status(204).send();
  });
};
