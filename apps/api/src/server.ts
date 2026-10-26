import { createApp } from './app.ts';

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '127.0.0.1';
const proxyHops = process.env.TRUST_PROXY_HOPS ?? '0';
const corsOrigins = (
  process.env.CORS_ORIGINS ?? ""
)
  .split(',')
  .map((origin) => origin.trim());

if (proxyHops !== '0' && proxyHops !== '1')
  throw new Error('TRUST_PROXY_HOPS must be 0 or 1');

// Service configuration is checked where used; retain production security policy.
if (process.env.NODE_ENV === 'production') {
  if (corsOrigins.some((origin) => !origin.startsWith('https://')))
    throw new Error('Production CORS origins must use HTTPS');

  const authSecrets = [
    process.env.AUTH_CODE_SECRET,
    process.env.AUTH_ACCESS_SECRET,
  ].map((secret) => secret?.toLowerCase());
  const otherSecrets = [
    process.env.API_CLIENT_CONTEXT_SECRET,
    process.env.PAYMOB_CHECKOUT_ENABLED === 'true'
      ? process.env.PAYMENT_CHECKOUT_SECRET
      : undefined,
  ];
  if (
    (authSecrets[0] && authSecrets[0] === authSecrets[1]) ||
    otherSecrets.some(
      (secret) => secret && authSecrets.includes(secret.toLowerCase()),
    )
  )
    throw new Error(
      'Authentication, client context and checkout secrets must be independent',
    );
}

const app = createApp(corsOrigins);
app.set('trust proxy', Number(proxyHops));
const server = app.listen(port, host, () => {
  console.log(JSON.stringify({ event: 'server_started', port }));
});
server.on('error', () => {
  console.error(JSON.stringify({ event: 'server_start_failed' }));
  process.exitCode = 1;
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
