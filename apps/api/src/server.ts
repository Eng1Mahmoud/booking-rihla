import { app } from './app.ts';
import { parseEnv } from './config/env.ts';

const env = parseEnv(process.env);

app.listen(env.PORT, '127.0.0.1', () => {
  console.log(`API running at http://127.0.0.1:${env.PORT}`);
});
