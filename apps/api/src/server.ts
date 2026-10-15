import { app } from './app.ts';

const port = 4000;

app.listen(port, '127.0.0.1', () => {
  console.log(`API running at http://127.0.0.1:${port}`);
});
