import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { createApp } from '../src/app.ts';

// Explicit values prove that the app uses its supplied configuration.
const allowedOrigins = ['http://localhost:3000', 'https://admin.example.com'];
const app = createApp(allowedOrigins);
let server: Server;
let baseUrl: string;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

for (const origin of allowedOrigins) {
  test(`allows browser response access for ${origin}`, async () => {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: origin },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.match(response.headers.get('vary') ?? '', /Origin/i);
    // Credentialed browser access is restricted to explicit allowed origins.
    assert.equal(
      response.headers.get('access-control-allow-credentials'),
      'true',
    );
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
}

test('does not grant CORS access for different ports, schemes, hosts, or null origins', async () => {
  for (const origin of [
    'http://localhost:3002',
    'https://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3000.attacker.example',
    'null',
  ]) {
    const response = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: origin },
    });

    // CORS controls browser access to responses, not server authorization.
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.deepEqual(await response.json(), { status: 'ok' });
  }
});

test('handles an allowed JSON and Authorization preflight before routing', async () => {
  const response = await fetch(`${baseUrl}/future-endpoint`, {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigins[0],
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,authorization',
    },
  });

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigins[0],
  );
  assert.match(
    response.headers.get('access-control-allow-methods') ?? '',
    /POST/,
  );
  const headers = response.headers.get('access-control-allow-headers') ?? '';
  assert.match(headers, /content-type/i);
  assert.match(headers, /authorization/i);
  assert.equal(await response.text(), '');
});

test('does not grant preflight access to an unlisted origin', async () => {
  const response = await fetch(`${baseUrl}/future-endpoint`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://unlisted.example.com',
      'Access-Control-Request-Method': 'POST',
    },
  });

  assert.equal(response.headers.get('access-control-allow-origin'), null);
  await response.text();
});

test('requests without Origin continue to work without a CORS grant', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('allowed origins can read validation error responses', async () => {
  const response = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: {
      Origin: allowedOrigins[0],
      'Content-Type': 'application/json',
    },
    body: '{"name":',
  });

  assert.equal(response.status, 400);
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigins[0],
  );
  assert.deepEqual(await response.json(), {
    error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
  });
});
