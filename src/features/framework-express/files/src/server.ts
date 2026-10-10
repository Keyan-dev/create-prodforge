import { createApp } from './app';
// @slot:imports

const port = Number(process.env.PORT ?? 3000);

const server = createApp().listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});
// @slot:shutdown

export { server };
