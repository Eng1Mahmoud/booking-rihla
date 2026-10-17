import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import { parsePaymobCheckoutEnv } from '../src/config/paymob.ts';
import {
  sessionService,
  type SessionService,
  type AuthContext,
} from '../src/services/sessionService.ts';
import type { PaymentCheckoutService } from '../src/services/paymentCheckoutService.ts';
const bookingId = randomUUID();
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
const data = {
  bookingId,
  bookingStatus: 'PENDING_PAYMENT' as const,
  paymentStatus: 'AWAITING_PAYMENT' as const,
  amountPiastres: 25000,
  currency: 'EGP' as const,
  expiresAt: '2099-01-01T00:10:00.000Z',
  serverTime: '2099-01-01T00:00:00.000Z',
};
const headers = {
  Authorization: 'Bearer valid',
  'Content-Type': 'application/json',
};
function fake(): PaymentCheckoutService {
  return {
    async start() {
      return {
        ...data,
        checkoutUrl:
          'https://accept.paymob.com/unifiedcheckout/?publicKey=pk_test_fixture&clientSecret=csk_test_fixture',
      };
    },
    async get() {
      return data;
    },
  };
}
async function start(t: TestContext, paymentCheckout?: PaymentCheckoutService) {
  const server = createApp([], {
    sessions,
    ...(paymentCheckout ? { paymentCheckout } : {}),
  }).listen(0, '127.0.0.1');
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
test('checkout and payment reads forward only the authenticated owner and booking UUID with no-store', async (t) => {
  const service = fake();
  let received: unknown;
  service.start = async (context, id) => {
    received = { context, id };
    return { ...data, checkoutUrl: null };
  };
  const base = await start(t, service);
  const response = await fetch(base + bookingId + '/checkout', {
    method: 'POST',
    headers,
    body: '{}',
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(
    response.headers.get('location'),
    '/api/v1/bookings/' + bookingId + '/payment',
  );
  assert.deepEqual(received, { context: auth, id: bookingId });
  assert.deepEqual(await response.json(), {
    data: { ...data, checkoutUrl: null },
  });
  service.get = async (userId, id) => {
    received = { userId, id };
    return data;
  };
  const status = await fetch(base + bookingId + '/payment', { headers });
  assert.equal(status.status, 200);
  assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received, { userId: auth.user.id, id: bookingId });
  assert.deepEqual(await status.json(), { data });
});
test('payment routes authenticate before validation and expose no public capture, void, refund or redirect handler', async (t) => {
  const service = fake();
  let calls = 0;
  service.start = async () => {
    calls++;
    return { ...data, checkoutUrl: null };
  };
  service.get = async () => {
    calls++;
    return data;
  };
  const base = await start(t, service);
  for (const path of ['checkout', 'payment'])
    for (const method of ['GET', 'POST'])
      assert.equal((await fetch(base + 'bad/' + path, { method })).status, 401);
  for (const [method, path] of [
    ['GET', 'checkout'],
    ['POST', 'payment'],
    ['POST', 'capture'],
    ['POST', 'void'],
    ['POST', 'refund'],
    ['DELETE', 'checkout'],
    ['PATCH', 'payment'],
    ['GET', 'payment/return'],
  ])
    assert.equal(
      (await fetch(base + bookingId + '/' + path, { method, headers })).status,
      404,
    );
  assert.equal(calls, 0);
});
test('client amounts, success flags, redirects, malformed ids and query parameters cannot initiate or confirm payment', async (t) => {
  const service = fake();
  let calls = 0;
  service.start = async () => {
    calls++;
    return { ...data, checkoutUrl: null };
  };
  service.get = async () => {
    calls++;
    return data;
  };
  const base = await start(t, service),
    url = base + bookingId + '/checkout';
  for (const body of [
    { amountPiastres: 1 },
    { currency: 'USD' },
    { success: true },
    { status: 'PAID' },
    { returnUrl: 'https://evil.test' },
    { userId: auth.user.id },
    { expiresAt: data.expiresAt },
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
  for (const path of ['bad/checkout', bookingId + '/checkout?amount=1'])
    assert.equal(
      (await fetch(base + path, { method: 'POST', headers, body: '{}' }))
        .status,
      400,
    );
  for (const path of [
    'bad/payment',
    bookingId + '/payment?success=true',
    bookingId + '/payment?transactionId=1&transactionId=2',
  ])
    assert.equal((await fetch(base + path, { headers })).status, 400);
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
test('expected checkout errors are safe; unexpected provider details and even unavailable messages are concealed', async (t) => {
  const service = fake();
  const base = await start(t, service);
  for (const [error, status, code] of [
    [
      new AppError(404, 'BOOKING_NOT_FOUND', 'Booking not found'),
      404,
      'BOOKING_NOT_FOUND',
    ],
    [
      new AppError(409, 'BOOKING_EXPIRED', 'Booking expired'),
      409,
      'BOOKING_EXPIRED',
    ],
    [
      new AppError(503, 'PAYMENT_UNAVAILABLE', 'private secret checkout URL'),
      503,
      'PAYMENT_UNAVAILABLE',
    ],
    [new Error('private secret checkout URL'), 500, 'INTERNAL_SERVER_ERROR'],
  ] as const) {
    service.start = async () => {
      throw error;
    };
    service.get = async () => {
      throw error;
    };
    for (const [method, path] of [
      ['POST', 'checkout'],
      ['GET', 'payment'],
    ]) {
      const response = await fetch(base + bookingId + '/' + path, {
        method,
        headers,
        ...(method === 'POST' ? { body: '{}' } : {}),
      });
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const result = await response.json();
      assert.equal(result.error.code, code);
      assert.ok(!JSON.stringify(result).includes('private'));
    }
  }
});
test('checkout has its own request limit while status reads remain available', async (t) => {
  const base = await start(t, fake());
  for (let i = 0; i < 20; i++)
    assert.equal(
      (
        await fetch(base + bookingId + '/checkout', {
          method: 'POST',
          headers,
          body: '{}',
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await fetch(base + bookingId + '/checkout', {
        method: 'POST',
        headers,
        body: '{}',
      })
    ).status,
    429,
  );
  assert.equal(
    (await fetch(base + bookingId + '/payment', { headers })).status,
    200,
  );
});
test('disabled checkout returns a safe 503 before accessing any database or provider', async (t) => {
  const previous = process.env['PAYMOB_CHECKOUT_ENABLED'];
  process.env['PAYMOB_CHECKOUT_ENABLED'] = 'false';
  t.after(() => {
    if (previous === undefined) delete process.env['PAYMOB_CHECKOUT_ENABLED'];
    else process.env['PAYMOB_CHECKOUT_ENABLED'] = previous;
  });
  const base = await start(t);
  const response = await fetch(base + bookingId + '/checkout', {
    method: 'POST',
    headers,
    body: '{}',
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'PAYMENT_UNAVAILABLE',
      message: 'Payment is temporarily unavailable',
    },
  });
});
test('checkout opt-in requires strict TEST settings, owner-scoped webhook and reconciliation', () => {
  const environment = {
    PAYMOB_CHECKOUT_ENABLED: 'true',
    PAYMOB_ENABLED: 'true',
    PAYMOB_WEBHOOK_ENABLED: 'true',
    PAYMOB_RECONCILIATION_ENABLED: 'true',
    PAYMOB_SECRET_KEY: 'sk_test_fixture',
    PAYMOB_PUBLIC_KEY: 'pk_test_fixture',
    PAYMOB_API_KEY: 'private_api',
    PAYMOB_HMAC_SECRET: 'private_hmac',
    PAYMOB_INTEGRATION_ID: '6741',
    PAYMOB_OWNER_ID: '4705',
    PAYMOB_AUTH_CAPTURE_ENABLED: 'true',
    PAYMOB_NOTIFICATION_URL:
      'https://api.example.test/api/v1/payments/paymob/webhook',
    PAYMOB_RETURN_URL: 'https://web.example.test/checkout/result',
  };
  assert.equal(parsePaymobCheckoutEnv({}), null);
  assert.equal(
    parsePaymobCheckoutEnv({ PAYMOB_CHECKOUT_ENABLED: 'false' }),
    null,
  );
  assert.equal(parsePaymobCheckoutEnv(environment)!.PAYMOB_OWNER_ID, 4705);
  for (const [overrides, expectedStatus] of [
    [{ PAYMOB_CHECKOUT_ENABLED: 'false', PAYMOB_ENABLED: 'false' }, 0],
    [{ PAYMOB_RECONCILIATION_ENABLED: 'false' }, 1],
    [{}, 0],
  ] as const) {
    const checked = spawnSync(
      process.execPath,
      ['src/scripts/checkPayments.ts'],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        timeout: 10000,
        env: {
          ...process.env,
          ...environment,
          PAYMENT_CHECKOUT_SECRET: 'ab'.repeat(32),
          DATABASE_URL: 'invalid',
          ...overrides,
        },
      },
    );
    assert.ifError(checked.error);
    assert.equal(checked.status, expectedStatus);
    assert.ok(!(checked.stdout + checked.stderr).includes('private'));
  }

  for (const patch of [
    { PAYMOB_CHECKOUT_ENABLED: 'yes' },
    { PAYMOB_ENABLED: 'false' },
    { PAYMOB_WEBHOOK_ENABLED: 'false' },
    { PAYMOB_RECONCILIATION_ENABLED: 'false' },
    { PAYMOB_OWNER_ID: '' },
    { PAYMOB_AUTH_CAPTURE_ENABLED: 'false' },
    { PAYMOB_SECRET_KEY: 'sk_live_private' },
  ])
    assert.throws(
      () => parsePaymobCheckoutEnv({ ...environment, ...patch }),
      (error: unknown) =>
        error instanceof Error && !error.message.includes('private'),
    );
});
