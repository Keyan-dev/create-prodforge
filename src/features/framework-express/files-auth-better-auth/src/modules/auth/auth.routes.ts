import { fromNodeHeaders } from 'better-auth/node';
import { type RequestHandler, Router } from 'express';
import { auth } from '../../lib/auth';
import { HttpError } from '../../middleware/error-handler';

/** Rejects a request without a valid session (401); the session is in `res.locals.session`. */
export const requireSession: RequestHandler = async (req, res, next) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) throw new HttpError(401, 'Authentication required');
  res.locals.session = session;
  next();
};

/** An example protected route: the signed-in user. */
export const authRouter = Router().get('/me', requireSession, (_req, res) => {
  res.json(res.locals.session.user);
});
