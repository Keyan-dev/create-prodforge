import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import {
  EmailTakenError,
  type User,
  type UsersRepository,
} from '../src/modules/users/users.schema';

// The routes are tested against an in-memory repository, so these tests need no database.
const users = new Map<string, User>();

vi.mock('../src/modules/users/users.repository', () => {
  const emailTaken = (email: string | undefined, id?: string) =>
    [...users.values()].some((user) => user.email === email && user.id !== id);

  const usersRepository: UsersRepository = {
    list: async ({ limit, offset }) => [...users.values()].slice(offset, offset + limit),
    findById: async (id) => users.get(id) ?? null,
    create: async (data) => {
      if (emailTaken(data.email)) throw new EmailTakenError();
      const now = new Date();
      const user = { id: randomUUID(), ...data, createdAt: now, updatedAt: now };
      users.set(user.id, user);
      return user;
    },
    update: async (id, data) => {
      const user = users.get(id);
      if (!user) return null;
      if (emailTaken(data.email, id)) throw new EmailTakenError();
      const updated = { ...user, ...data, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    },
    remove: async (id) => users.delete(id),
  };
  return { usersRepository };
});

const app = createApp();
const ada = { email: 'ada@example.com', name: 'Ada Lovelace' };

describe('users', () => {
  beforeEach(() => users.clear());

  it('creates, reads, updates and deletes a user', async () => {
    const created = await request(app).post('/users').send(ada);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject(ada);
    const { id } = created.body;
    expect(created.headers.location).toBe(`/users/${id}`);

    expect((await request(app).get(`/users/${id}`)).body).toMatchObject(ada);
    expect((await request(app).get('/users')).body).toHaveLength(1);

    const updated = await request(app).patch(`/users/${id}`).send({ name: 'Ada King' });
    expect(updated.status).toBe(200);
    expect(updated.body.name).toBe('Ada King');

    expect((await request(app).delete(`/users/${id}`)).status).toBe(204);
    expect((await request(app).get(`/users/${id}`)).status).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const response = await request(app).post('/users').send({ email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.fieldErrors).toHaveProperty('email');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/users').send(ada);
    const response = await request(app).post('/users').send(ada);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already exists/);
  });

  it('answers 404 for an unknown id', async () => {
    expect((await request(app).get('/users/unknown')).status).toBe(404);
    expect((await request(app).patch('/users/unknown').send({ name: 'x' })).status).toBe(404);
    expect((await request(app).delete('/users/unknown')).status).toBe(404);
  });
});
