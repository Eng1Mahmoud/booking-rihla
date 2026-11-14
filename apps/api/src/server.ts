import { createApp } from './app.ts';

// 1. Read network settings and reject unsupported proxy configurations.
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';
const trustedProxyHops = process.env.TRUST_PROXY_HOPS ?? '0';


// 2. Build the application and start accepting HTTP connections.
const app = createApp();
// Set the number of trusted proxy hops to support reverse proxies like render.
app.set('trust proxy', Number(trustedProxyHops));

const server = app.listen(port, host, () => {
  console.log(JSON.stringify({ event: 'server_started', port }));
});

// Handle errors that occur while starting the server, such as the port being in use.
server.on('error', () => {
  console.error(JSON.stringify({ event: 'server_start_failed' }));
  process.exitCode = 1;
});

// 3. Stop accepting connections, finish active requests, then close the database.
function shutdown() {
  if (app.locals.stopping) return;
  app.locals.stopping = true;
  console.log(JSON.stringify({ event: 'server_stopping' }));

  // Bound shutdown time so a stuck request or database close cannot hang forever.
  const shutdownDeadline = setTimeout(() => {
    console.error(JSON.stringify({ event: 'shutdown_timeout' }));
    server.closeAllConnections();
    process.exit(1);
  }, 15_000);
  shutdownDeadline.unref();

  server.close(async (error) => {
    try {
      const { db } = await import('./prisma/db.ts');
      await db.close();
      process.exitCode = error ? 1 : 0;
    } catch {
      process.exitCode = 1;
      console.error(JSON.stringify({ event: 'database_close_failed' }));
    } finally {
      clearTimeout(shutdownDeadline);
    }
  });
}

// Ctrl+C locally, or a termination signal from the hosting platform.
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
