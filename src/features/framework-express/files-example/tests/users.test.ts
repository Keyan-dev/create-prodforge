import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { memoryUsersRepository } from './support/memory-users-repository';

// The routes run against an in-memory repository, so these tests need no database.
vi.mock('../src/modules/users/users.repository', async () => ({
  usersRepository: (await import('./support/memory-users-repository')).memoryUsersRepository,
}));

const app = createApp();
const ada = { email: 'ada@example.com', name: 'Ada Lovelace' };

describe('users', () => {
  beforeEach(() => memoryUsersRepository.reset());

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
