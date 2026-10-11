import { z } from 'zod';
import type { ZodOpenApiOperationObject, ZodOpenApiPathsObject } from 'zod-openapi';
import { errorResponse, json } from '../../openapi/schemas';
import { CreateUserSchema, ListUsersSchema, UpdateUserSchema } from './users.schema';

const UserSchema = z
  .object({
    id: z.string(),
    email: z.email(),
    name: z.string(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'User' });

const byId = { path: z.object({ id: z.string() }) };
const notFound = errorResponse('No user with this id');
const invalid = errorResponse('Invalid request body or query');
const emailTaken = errorResponse('Another user already has this email');

const tagged = (operation: ZodOpenApiOperationObject) => ({ tags: ['users'], ...operation });

/** OpenAPI paths for the users routes, added to the document in src/openapi/document.ts. */
export const usersPaths: ZodOpenApiPathsObject = {
  '/users': {
    get: tagged({
      summary: 'List users',
      requestParams: { query: ListUsersSchema },
      responses: {
        '200': { description: 'A page of users', content: json(z.array(UserSchema)) },
        '400': invalid,
      },
    }),
    post: tagged({
      summary: 'Create a user',
      requestBody: { content: json(CreateUserSchema) },
      responses: {
        '201': { description: 'Created', content: json(UserSchema) },
        '400': invalid,
        '409': emailTaken,
      },
    }),
  },
  '/users/{id}': {
    get: tagged({
      summary: 'Get a user',
      requestParams: byId,
      responses: { '200': { description: 'The user', content: json(UserSchema) }, '404': notFound },
    }),
    patch: tagged({
      summary: 'Update a user',
      requestParams: byId,
      requestBody: { content: json(UpdateUserSchema) },
      responses: {
        '200': { description: 'The updated user', content: json(UserSchema) },
        '400': invalid,
        '404': notFound,
        '409': emailTaken,
      },
    }),
    delete: tagged({
      summary: 'Delete a user',
      requestParams: byId,
      responses: { '204': { description: 'Deleted' }, '404': notFound },
    }),
  },
};
