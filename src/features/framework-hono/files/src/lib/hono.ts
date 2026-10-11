import type { HttpBindings } from '@hono/node-server';
import { Hono } from 'hono';
import type { RequestIdVariables } from 'hono/request-id';
import type { Logger } from 'pino';

/** Types for `c.env` (the Node request) and `c.get()` (request id and per-request logger). */
export interface AppEnv {
  Bindings: HttpBindings;
  Variables: RequestIdVariables & { log: Logger };
}

/** A Hono app or router with the app's types. */
export const createRouter = () => new Hono<AppEnv>();
