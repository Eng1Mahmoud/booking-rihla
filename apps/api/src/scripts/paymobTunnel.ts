import { createServer } from 'node:http';
import { parseEnv } from '../config/env.ts';

// Development-only ingress: never expose the general API through a quick tunnel.
if (parseEnv(process.env).NODE_ENV === 'production')
  throw new Error('The payment development proxy is disabled in production');
const webhook = '/api/v1/payments/paymob/webhook';
const returnPath = '/api/v1/payments/paymob/return';
const maxBytes = 100 * 1024;
const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1:4010');
    if (request.method === 'GET' && url.pathname === returnPath) {
      // Ignore all Paymob query values. The owned-booking API confirms payment.
      response.writeHead(302, {
        Location: 'http://localhost:3000/ar/bookings',
      });
      response.end();
      return;
    }
    if (request.method !== 'POST' || url.pathname !== webhook) {
      response.writeHead(404);
      response.end();
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of request) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > maxBytes) {
        response.writeHead(413);
        response.end();
        return;
      }
      chunks.push(buffer);
    }
    const upstream = await fetch(
      'http://127.0.0.1:4000' + url.pathname + url.search,
      {
        method: 'POST',
        headers: {
          'Content-Type': request.headers['content-type'] ?? 'application/json',
        },
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(12000),
      },
    );
    response.writeHead(upstream.status, { 'Content-Type': 'application/json' });
    response.end(await upstream.text());
  } catch {
    if (!response.headersSent) response.writeHead(502);
    response.end();
  }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(4010, '127.0.0.1', () =>
  console.log(
    'Restricted TEST ingress listening on 127.0.0.1:4010 (webhook and browser return only)',
  ),
);
server.on('error', () => {
  console.error(
    'Could not start the payment development ingress; check port 4010',
  );
  process.exitCode = 1;
});
