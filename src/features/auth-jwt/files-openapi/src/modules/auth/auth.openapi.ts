import { z } from 'zod';
import type { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponse, json } from '../../openapi/schemas';
import { CredentialsSchema, RefreshSchema } from './auth.schema';

const TokensSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.string(),
  })
  .meta({ id: 'Tokens' });

const tokens = (description: string) => ({ description, content: json(TokensSchema) });
const invalid = errorResponse('Invalid request body');
const tagged = (operation: ZodOpenApiOperationObject) => ({ tags: ['auth'], ...operation });

/** OpenAPI paths for the auth routes, added to the document in src/openapi/document.ts. */
export const authPaths: ZodOpenApiPathsObject = {
  '/auth/register': {
    post: tagged({
      summary: 'Create an account and get tokens',
      requestBody: { content: json(CredentialsSchema) },
      responses: {
        '201': tokens('Registered'),
        '400': invalid,
        '409': errorResponse('Email already registered'),
      },
    }),
  },
  '/auth/login': {
    post: tagged({
      summary: 'Log in and get tokens',
      requestBody: { content: json(CredentialsSchema) },
      responses: {
        '200': tokens('Logged in'),
        '400': invalid,
        '401': errorResponse('Wrong email or password'),
      },
    }),
  },
  '/auth/refresh': {
    post: tagged({
      summary: 'Exchange a refresh token for new tokens',
      requestBody: { content: json(RefreshSchema) },
      responses: { '200': tokens('New tokens'), '401': errorResponse('Invalid refresh token') },
    }),
  },
  '/auth/me': {
    get: tagged({
      summary: 'The logged-in account',
      security: [{ bearerAuth: [] }],
      responses: {
        '200': {
          description: 'The account',
          content: json(z.object({ id: z.string(), email: z.email() })),
        },
        '401': errorResponse('Missing or invalid access token'),
      },
    }),
  },
};
