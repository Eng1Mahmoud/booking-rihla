import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { once } from 'node:events';
import type { Server } from 'node:http';
import express from 'express';
import { AppError } from '../src/errors/AppError.ts';
import { errorHandler } from '../src/middlewares/errorHandler.ts';

// These routes exist only in the tests, not in the real API.
const testApp = express();
const privateMessage = 'database password must never appear in the response';

testApp.get('/expected', () => {
  throw new AppError(409, 'SEAT_UNAVAILABLE', 'This seat is unavailable');
});

testApp.get('/unexpected', () => {
  throw new Error(privateMessage);
});

testApp.get('/async', async () => {
  await Promise.reject(new Error(privateMessage));
});

testApp.get('/server-error', () => {
  throw new AppError(503, 'DATABASE_UNAVAILABLE', privateMessage);
});

testApp.get('/untrusted', (_request, _response, next) => {
  next({ statusCode: 400, code: 'UNTRUSTED', message: privateMessage });
});

testApp.use(errorHandler);

let server: Server;
let baseUrl: string;

before(async () => {
  server = testApp.listen(0, '127.0.0.1');
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

test('expected request errors preserve their status and safe message', async () => {
  const response = await fetch(`${baseUrl}/expected`);
  assert.equal(response.status, 409);
  assert.match(response.headers.get('content-type') ?? '', /application\/json/);
  assert.deepEqual(await response.json(), {
    error: { code: 'SEAT_UNAVAILABLE', message: 'This seat is unavailable' },
  });
});

for (const path of ['/unexpected', '/async', '/server-error', '/untrusted']) {
  test(`${path} returns generic JSON without leaking internal details`, async () => {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 500);
    assert.match(
      response.headers.get('content-type') ?? '',
      /application\/json/,
    );
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  });
}
