import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import type { User } from '../src/modules/users/users.schema';
import { memoryUsersRepository } from './support/memory-users-repository';

// The routes run against an in-memory repository, so these tests need no database.
vi.mock('../src/modules/users/users.repository', async () => ({
  usersRepository: (await import('./support/memory-users-repository')).memoryUsersRepository,
}));

const app = createApp();
const ada = { email: 'ada@example.com', name: 'Ada Lovelace' };

interface ErrorBody {
  error: { message: string; details?: { fieldErrors: Record<string, string[]> } };
}

/** Response bodies are JSON: users as plain objects, failures as `{ error }`. */
const read = async <T>(response: Response) => (await response.json()) as T;

function send(method: string, path: string, body?: unknown) {
  return app.request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('users', () => {
  beforeEach(() => memoryUsersRepository.reset());

  it('creates, reads, updates and deletes a user', async () => {
    const created = await send('POST', '/users', ada);
    expect(created.status).toBe(201);
    const user = await read<User>(created);
    expect(user).toMatchObject(ada);
    expect(created.headers.get('location')).toBe(`/users/${user.id}`);

    expect(await read<User>(await app.request(`/users/${user.id}`))).toMatchObject(ada);
    expect(await read<User[]>(await app.request('/users'))).toHaveLength(1);

    const updated = await send('PATCH', `/users/${user.id}`, { name: 'Ada King' });
    expect(updated.status).toBe(200);
    expect((await read<User>(updated)).name).toBe('Ada King');

    expect((await app.request(`/users/${user.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await app.request(`/users/${user.id}`)).status).toBe(404);
  });

  it('rejects an invalid body with 400', async () => {
    const response = await send('POST', '/users', { email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect((await read<ErrorBody>(response)).error.details?.fieldErrors).toHaveProperty('email');
  });

  it('rejects malformed JSON with 400', async () => {
    expect((await send('POST', '/users', '{"oops"')).status).toBe(400);
  });

  it('rejects a duplicate email with 409', async () => {
    await send('POST', '/users', ada);
    const response = await send('POST', '/users', ada);

    expect(response.status).toBe(409);
    expect((await read<ErrorBody>(response)).error.message).toMatch(/already exists/);
  });

  it('answers 404 for an unknown id', async () => {
    expect((await app.request('/users/unknown')).status).toBe(404);
    expect((await send('PATCH', '/users/unknown', {})).status).toBe(404);
    expect((await app.request('/users/unknown', { method: 'DELETE' })).status).toBe(404);
  });
});
