import { Router } from 'express';
import { HttpError } from '../../middleware/error-handler';
import { usersRepository } from './users.repository';
import { CreateUserSchema, ListUsersSchema, UpdateUserSchema } from './users.schema';

/** CRUD routes for users. Invalid input throws a ZodError, which the error handler sends as 400. */
export const usersRouter = Router();

const notFound = () => new HttpError(404, 'User not found');

usersRouter.get('/', async (req, res) => {
  res.json(await usersRepository.list(ListUsersSchema.parse(req.query)));
});

usersRouter.post('/', async (req, res) => {
  const user = await usersRepository.create(CreateUserSchema.parse(req.body));
  res.status(201).location(`${req.baseUrl}/${user.id}`).json(user);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await usersRepository.findById(req.params.id);
  if (!user) throw notFound();
  res.json(user);
});

usersRouter.patch('/:id', async (req, res) => {
  const user = await usersRepository.update(req.params.id, UpdateUserSchema.parse(req.body));
  if (!user) throw notFound();
  res.json(user);
});

usersRouter.delete('/:id', async (req, res) => {
  if (!(await usersRepository.remove(req.params.id))) throw notFound();
  res.status(204).end();
});
