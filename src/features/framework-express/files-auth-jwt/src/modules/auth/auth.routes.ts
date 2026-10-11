import { type RequestHandler, Router } from 'express';
import { CredentialsSchema, RefreshSchema } from './auth.schema';
import { authService } from './auth.service';

/** Rejects a request without a valid access token (401); the account is in `res.locals.user`. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  res.locals.user = await authService.authenticate(req.headers.authorization);
  next();
};

export const authRouter = Router()
  .post('/register', async (req, res) => {
    res.status(201).json(await authService.register(CredentialsSchema.parse(req.body)));
  })
  .post('/login', async (req, res) => {
    res.json(await authService.login(CredentialsSchema.parse(req.body)));
  })
  .post('/refresh', async (req, res) => {
    res.json(await authService.refresh(RefreshSchema.parse(req.body).refreshToken));
  })
  .get('/me', requireAuth, (_req, res) => {
    res.json(res.locals.user);
  });
