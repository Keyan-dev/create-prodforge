import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { memoryAccountsRepository } from './support/memory-accounts-repository';

// The routes run against in-memory accounts, so these tests need no database.
vi.mock('../src/modules/auth/auth.repository', async () => ({
  accountsRepository: (await import('./support/memory-accounts-repository'))
    .memoryAccountsRepository,
}));

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const ada = { email: 'ada@example.com', password: 'correct horse battery' };

const app = createApp();

async function send(method: string, path: string, body?: unknown, headers = {}) {
  const response = await app.request(path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: (await response.json()) as unknown };
}

describe('auth', () => {
  beforeEach(() => memoryAccountsRepository.reset());

  it('registers, logs in, refreshes and reads the account', async () => {
    const registered = await send('POST', '/auth/register', ada);
    expect(registered.status).toBe(201);
    expect(registered.body).toMatchObject({ tokenType: 'Bearer' });

    const login = await send('POST', '/auth/login', ada);
    expect(login.status).toBe(200);
    const { accessToken, refreshToken } = login.body as Tokens;

    const me = await send('GET', '/auth/me', undefined, { authorization: `Bearer ${accessToken}` });
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({ email: ada.email });

    const refreshed = await send('POST', '/auth/refresh', { refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body).toHaveProperty('accessToken');
  });

  it('rejects a wrong password, a duplicate email and bad input', async () => {
    await send('POST', '/auth/register', ada);

    expect((await send('POST', '/auth/login', { ...ada, password: 'wrong-password' })).status).toBe(
      401,
    );
    expect((await send('POST', '/auth/register', ada)).status).toBe(409);
    const invalid = await send('POST', '/auth/register', { email: 'nope', password: 'x' });
    expect(invalid.status).toBe(400);
  });

  it('requires a valid access token', async () => {
    const { body } = await send('POST', '/auth/register', ada);
    const { refreshToken } = body as Tokens;

    expect((await send('GET', '/auth/me')).status).toBe(401);
    const forged = await send('GET', '/auth/me', undefined, { authorization: 'Bearer nope' });
    expect(forged.status).toBe(401);
    // A refresh token is not an access token.
    const wrongType = { authorization: `Bearer ${refreshToken}` };
    expect((await send('GET', '/auth/me', undefined, wrongType)).status).toBe(401);
  });
});
