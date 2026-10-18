import { validateProductionEnv } from './config/production.ts';
import { createApp } from './app.ts';
import { parseEnv } from './config/env.ts';

const env = parseEnv(process.env);
validateProductionEnv(process.env);
const app = createApp(env.CORS_ORIGINS);
app.set('trust proxy', env.TRUST_PROXY_HOPS);
const server = app.listen(env.PORT, env.HOST, () => {
  console.log(JSON.stringify({ event: 'server_started', port: env.PORT }));
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  app.locals.stopping = true;
  console.log(JSON.stringify({ event: 'server_stopping' }));
  const deadline = setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_timeout' }));
    server.closeAllConnections();
    process.exit(1);
  }, 15000);
  deadline.unref();
  server.close(async (error) => {
    try {
      const { db } = await import('./prisma/db.ts');
      await db.close();
      process.exitCode = error ? 1 : 0;
    } catch {
      process.exitCode = 1;
      console.error(JSON.stringify({ event: 'database_close_failed' }));
    } finally {
      clearTimeout(deadline);
    }
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('error', () => {
  console.error(JSON.stringify({ event: 'server_start_failed' }));
  process.exitCode = 1;
});
