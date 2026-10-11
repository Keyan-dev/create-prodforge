import type { FastifyReply, FastifyRequest } from 'fastify';
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

export function notFound(request: FastifyRequest, reply: FastifyReply) {
  const path = request.url.split('?')[0];
  void reply.status(404).send({
    error: { message: `Cannot ${request.method} ${path}`, requestId: request.id },
  });
}

/** Status of an error that is safe to show: Fastify's own 4xx (bad JSON, …) or `expose`. */
function exposedStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) {
    return error.statusCode;
  }
  if ('status' in error && typeof error.status === 'number' && 'expose' in error) {
    return error.expose === true ? error.status : undefined;
  }
  return undefined;
}

/** One JSON error shape for everything. 5xx details are logged, never sent to the client. */
export function errorHandler(error: unknown, request: FastifyRequest, reply: FastifyReply) {
  let status = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  const exposed = exposedStatus(error);
  if (error instanceof HttpError) {
    ({ status, message, details } = error);
  } else if (error instanceof z.ZodError) {
    status = 400;
    message = 'Validation failed';
    details = z.flattenError(error);
  } else if (exposed !== undefined && error instanceof Error) {
    status = exposed;
    message = error.message;
  }

  if (status >= 500) request.log.error({ err: error }, 'Request failed');

  void reply.status(status).send({ error: { message, details, requestId: request.id } });
}
