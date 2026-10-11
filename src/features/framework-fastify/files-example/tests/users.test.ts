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
    const created = await app.inject({ method: 'POST', url: '/users', payload: ada });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject(ada);
    const { id } = created.json();
    expect(created.headers.location).toBe(`/users/${id}`);

    expect((await app.inject({ method: 'GET', url: `/users/${id}` })).json()).toMatchObject(ada);
    expect((await app.inject({ method: 'GET', url: '/users' })).json()).toHaveLength(1);

    const updated = await app.inject({
      method: 'PATCH',
      url: `/users/${id}`,
      payload: { name: 'Ada King' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().name).toBe('Ada King');

    expect((await app.inject({ method: 'DELETE', url: `/users/${id}` })).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: `/users/${id}` })).statusCode).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      payload: { email: 'not-an-email' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.details.fieldErrors).toHaveProperty('email');
  });

  it('rejects malformed JSON with 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/users',
      headers: { 'content-type': 'application/json' },
      payload: '{"oops"',
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    await app.inject({ method: 'POST', url: '/users', payload: ada });
    const response = await app.inject({ method: 'POST', url: '/users', payload: ada });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.message).toMatch(/already exists/);
  });

  it('answers 404 for an unknown id', async () => {
    expect((await app.inject({ method: 'GET', url: '/users/unknown' })).statusCode).toBe(404);
    const patch = await app.inject({ method: 'PATCH', url: '/users/unknown', payload: {} });
    expect(patch.statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: '/users/unknown' })).statusCode).toBe(404);
  });
});
