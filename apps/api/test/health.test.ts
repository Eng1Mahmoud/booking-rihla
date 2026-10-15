import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import type { Server } from 'node:http';
import { app } from '../src/app.ts';

let server: Server;
let baseUrl: string;

before(async () => {
  // Port 0 chooses an available port, avoiding conflicts with the dev server.
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

test('health endpoint responds to a real HTTP request with JSON', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('unknown routes return a consistent JSON error', async () => {
  const response = await fetch(`${baseUrl}/missing`);

  assert.equal(response.status, 404);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

test('valid JSON reaches normal routing', async () => {
  const response = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Mahmoud' }),
  });

  // No POST route exists yet, so valid input continues to the normal 404.
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

test('JSON exactly at the 100kb limit is accepted by the parser', async () => {
  // {"data":""} uses 11 bytes, and each ASCII x uses one byte.
  const body = JSON.stringify({ data: 'x'.repeat(100 * 1024 - 11) });
  assert.equal(Buffer.byteLength(body), 100 * 1024);

  const response = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

test('malformed JSON returns a safe 400 response', async () => {
  const response = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"password":"private-value"',
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await response.json(), {
    error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' },
  });
});

test('JSON exceeding 100kb returns a safe 413 response', async () => {
  const body = JSON.stringify({ data: 'x'.repeat(100 * 1024 - 10) });
  assert.equal(Buffer.byteLength(body), 100 * 1024 + 1);

  const response = await fetch(`${baseUrl}/missing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  assert.equal(response.status, 413);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(await response.json(), {
    error: {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'JSON request body must not exceed 100kb',
    },
  });
});
