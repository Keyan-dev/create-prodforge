import { z } from 'zod';

/** The body every error response has (see the error handler). */
export const ErrorSchema = z
  .object({
    error: z.object({
      message: z.string(),
      requestId: z.string().optional(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: 'Error' });

/** A JSON response or request body with this schema. */
export const json = (schema: z.ZodType) => ({ 'application/json': { schema } });

/** An error response with this description. */
export const errorResponse = (description: string) => ({
  description,
  content: json(ErrorSchema),
});
