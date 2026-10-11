import type { ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import type { AppEnv } from '../lib/hono';
import { logger } from '../lib/logger';

export const notFound: NotFoundHandler<AppEnv> = (c) =>
  c.json(
    { error: { message: `Cannot ${c.req.method} ${c.req.path}`, requestId: c.get('requestId') } },
    404,
  );

/** Errors that carry a safe-to-show status and message, such as `EmailTakenError`. */
function isExposedError(
  error: unknown,
): error is { status: ContentfulStatusCode; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'expose' in error &&
    error.expose === true
  );
}

/**
 * One JSON error shape for everything. Throw `HTTPException` from a handler for a specific
 * status. 5xx details are logged, never sent to the client.
 */
export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  let status: ContentfulStatusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (error instanceof HTTPException) {
    status = error.status as ContentfulStatusCode;
    message = error.message;
  } else if (error instanceof z.ZodError) {
    status = 400;
    message = 'Validation failed';
    details = z.flattenError(error);
  } else if (error instanceof SyntaxError) {
    // `c.req.json()` throws this for a malformed body.
    status = 400;
    message = 'Malformed JSON';
  } else if (isExposedError(error)) {
    ({ status, message } = error);
  }

  if (status >= 500) (c.get('log') ?? logger).error({ err: error }, 'Request failed');

  return c.json({ error: { message, details, requestId: c.get('requestId') } }, status);
};
