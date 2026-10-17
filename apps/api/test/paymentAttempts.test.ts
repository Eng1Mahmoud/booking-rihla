import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  sessionService,
  type SessionService,
  type AuthContext,
} from '../src/services/sessionService.ts';
import type { PaymentAttemptService } from '../src/services/paymentAttemptService.ts';
const bookingId = randomUUID(),
  key = randomUUID();
const auth: AuthContext = {
  user: {
    id: randomUUID(),
    role: 'USER',
    name: 'Passenger',
    email: 'person@example.test',
    phone: '+201012345678',
    language: 'ar',
    emailVerifiedAt: '2026-01-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  sessionId: randomUUID(),
};
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (token !== 'valid')
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return auth;
  },
};
const attempt = {
  id: randomUUID(),
  bookingId,
  status: 'PREPARED' as const,
  amountPiastres: 50000,
  currency: 'EGP',
  expiresAt: '2099-01-01T00:10:00.000Z',
  createdAt: '2099-01-01T00:00:00.000Z',
};
function fakeService(): PaymentAttemptService {
  return {
    async prepare() {
      return { data: attempt, created: true };
    },
    async findByBooking() {
      return attempt;
    },
  };
}
async function start(t: TestContext, service = fakeService()) {
  const server = createApp([], { sessions, paymentAttempts: service }).listen(
    0,
    '127.0.0.1',
  );
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/bookings/';
}
const headers = {
  Authorization: 'Bearer valid',
  'Content-Type': 'application/json',
  'Idempotency-Key': key,
};

test('payment preparation forwards the authenticated owner and canonical key, returning 201 or 200 without a checkout URL', async (t) => {
  const service = fakeService();
  let received: unknown;
  let created = true;
  service.prepare = async (context, id, token) => {
    received = { context, id, token };
    return { data: attempt, created };
  };
  const base = await start(t, service);
  for (const status of [201, 200]) {
    const response = await fetch(base + bookingId + '/payment-attempt', {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': key.toUpperCase() },
      body: '{}',
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(
      response.headers.get('location'),
      '/api/v1/bookings/' + bookingId + '/payment-attempt',
    );
    assert.deepEqual(await response.json(), { data: attempt });
    assert.deepEqual(received, { context: auth, id: bookingId, token: key });
    created = false;
  }
});

test('payment routes authenticate before handling input and expose no capture, cancellation or mutation endpoint', async (t) => {
  const service = fakeService();
  let calls = 0;
  service.prepare = async () => {
    calls++;
    return { data: attempt, created: true };
  };
  service.findByBooking = async () => {
    calls++;
    return attempt;
  };
  const base = await start(t, service);
  for (const method of ['GET', 'POST'])
    assert.equal(
      (await fetch(base + 'bad/payment-attempt', { method })).status,
      401,
    );
  for (const [method, path] of [
    ['DELETE', 'payment-attempt'],
    ['PATCH', 'payment-attempt'],
    ['POST', 'payment-attempt/capture'],
    ['POST', 'payment-attempt/cancel'],
  ])
    assert.equal(
      (
        await fetch(base + bookingId + '/' + path, {
          method,
          headers,
          body: '{}',
        })
      ).status,
      404,
    );
  assert.equal(calls, 0);
});

test('invalid payment ids, repeated keys, query fields and client-controlled amounts never reach the service', async (t) => {
  const service = fakeService();
  let calls = 0;
  service.prepare = async () => {
    calls++;
    return { data: attempt, created: true };
  };
  const base = await start(t, service);
  const url = base + bookingId + '/payment-attempt';
  for (const body of [
    { amountPiastres: 1 },
    { currency: 'USD' },
    { userId: auth.user.id },
    { expiresAt: attempt.expiresAt },
    { status: 'CONFIRMED' },
    { checkoutUrl: 'https://example.test' },
    [],
    null,
  ])
    assert.equal(
      (
        await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  for (const value of ['', 'bad', key + ', ' + key])
    assert.equal(
      (
        await fetch(url, {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': value },
          body: '{}',
        })
      ).status,
      400,
    );
  const withoutKey = new Headers(headers);
  withoutKey.delete('Idempotency-Key');
  assert.equal(
    (await fetch(url, { method: 'POST', headers: withoutKey, body: '{}' }))
      .status,
    400,
  );
  assert.equal(
    (await fetch(url + '?price=1', { method: 'POST', headers, body: '{}' }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(base + 'bad/payment-attempt', {
        method: 'POST',
        headers,
        body: '{}',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'text/plain' },
        body: '{}',
      })
    ).status,
    415,
  );
  assert.equal(calls, 0);
});

test('payment reads use owner scope, hide absent attempts and validate query/ids before service calls', async (t) => {
  const service = fakeService();
  let received: unknown;
  let found = true;
  service.findByBooking = async (userId, id) => {
    received = { userId, id };
    return found ? attempt : null;
  };
  const base = await start(t, service),
    url = base + bookingId + '/payment-attempt';
  const response = await fetch(url, { headers });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { data: attempt });
  assert.deepEqual(received, { userId: auth.user.id, id: bookingId });
  found = false;
  const missing = await fetch(url, { headers });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'PAYMENT_ATTEMPT_NOT_FOUND');
  received = undefined;
  assert.equal((await fetch(url + '?owner=someone', { headers })).status, 400);
  assert.equal(
    (await fetch(base + 'bad/payment-attempt', { headers })).status,
    400,
  );
  assert.equal(received, undefined);
});

test('payment routes preserve safe business errors and conceal unexpected storage details', async (t) => {
  const service = fakeService();
  let failure: Error = new AppError(409, 'BOOKING_EXPIRED', 'Booking expired');
  service.prepare = async () => {
    throw failure;
  };
  service.findByBooking = async () => {
    throw failure;
  };
  const base = await start(t, service),
    url = base + bookingId + '/payment-attempt';
  for (const method of ['GET', 'POST']) {
    assert.equal(
      (
        await fetch(url, {
          method,
          headers,
          ...(method === 'POST' ? { body: '{}' } : {}),
        })
      ).status,
      409,
    );
  }
  failure = new Error('private database credentials');
  for (const method of ['GET', 'POST']) {
    const response = await fetch(url, {
      method,
      headers,
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
