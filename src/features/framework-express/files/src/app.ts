import express from 'express';
// @slot:imports

/** Build the app without listening, so tests can drive it directly. */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  // @slot:middleware

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  // @slot:routes

  return app;
}
