import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';

/** Throw this from a handler to send a specific status and message. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Cannot ${req.method} ${req.path}`));
};

/** Errors that come from body parsing etc. carry a safe-to-show status and message. */
function isExposedError(error: unknown): error is { status: number; message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'expose' in error &&
    error.expose === true
  );
}

/** One JSON error shape for everything. 5xx details are logged, never sent to the client. */
export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  let status = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (error instanceof HttpError) {
    ({ status, message, details } = error);
  } else if (error instanceof z.ZodError) {
    status = 400;
    message = 'Validation failed';
    details = z.flattenError(error);
  } else if (isExposedError(error)) {
    ({ status, message } = error);
  }

  if (status >= 500) req.log.error({ err: error }, 'Request failed');

  res.status(status).json({ error: { message, details, requestId: req.id } });
};
