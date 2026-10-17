import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import {
  sessionService,
  type SessionService,
} from '../src/services/sessionService.ts';
import type { AdminPaymentService } from '../src/services/adminPaymentService.ts';
const sessions: SessionService = {
  ...sessionService,
  async authenticateAccessToken(token) {
    if (token !== 'USER' && token !== 'ADMIN' && token !== 'SUPER_ADMIN')
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
    return {
      sessionId: randomUUID(),
      user: {
        id: randomUUID(),
        name: 'Operator',
        email: 'operator@example.test',
        phone: '+201012345678',
        role: token,
        language: 'ar',
        emailVerifiedAt: '2026-01-01T00:00:00Z',
        createdAt: '2026-01-01T00:00:00Z',
      },
    };
  },
};
const empty: AdminPaymentService = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
};
async function start(
  t: TestContext,
  adminPayments: AdminPaymentService = empty,
) {
  const server = createApp([], { sessions, adminPayments }).listen(
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
  return 'http://127.0.0.1:' + address.port + '/api/v1/admin/payments';
}
const adminHeaders = { Authorization: 'Bearer ADMIN' };
test('admin payment filters normalize exact searches and forward bounded pagination', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async list(query) {
      received = query;
      return [];
    },
  });
  const bookingId = randomUUID(),
    tripId = randomUUID(),
    userId = randomUUID();
  const query = {
    bookingId,
    tripId,
    userId,
    reference: ' bus-abcdef0123456789 ',
    email: ' PERSON@EXAMPLE.TEST ',
    orderId: '823456',
    transactionId: '923456',
    intentionId: 'pi_test_fixture',
    authorizationStatus: 'EXPIRED',
    settlementStatus: 'REVIEW',
    settlementKind: 'CAPTURE',
    createdDate: '2026-10-29',
    limit: '2',
    offset: '3',
  };
  const response = await fetch(base + '?' + new URLSearchParams(query), {
    headers: adminHeaders,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { limit: 2, offset: 3 },
  });
  assert.deepEqual(received, {
    ...query,
    reference: 'BUS-ABCDEF0123456789',
    email: 'person@example.test',
    limit: 2,
    offset: 3,
  });
  await fetch(base, { headers: adminHeaders });
  assert.deepEqual(received, { limit: 20, offset: 0 });
});
test('invalid and repeated payment filters never reach the database service', async (t) => {
  let calls = 0;
  const fail = async () => {
    calls++;
    throw new Error('not reached');
  };
  const base = await start(t, { list: fail, findById: fail });
  for (const query of [
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'bookingId=bad',
    'tripId=bad',
    'userId=bad',
    'email=bad',
    'reference=BUS-123',
    'orderId=0',
    'orderId=-1',
    'orderId=1e3',
    'orderId=9007199254740992',
    'transactionId=01',
    'transactionId=1.5',
    'intentionId=pi_live_private',
    'intentionId=pi_test_',
    'authorizationStatus=PAID',
    'settlementStatus=FAILED',
    'settlementKind=REFUND',
    'createdDate=2026-02-29',
    'createdDate=1999-12-31',
    'createdDate=9999-01-01',
    'createdDate=2026-1-1',
    'paymentStatus=PAID',
    'status=PAID',
    'q=anything',
    'checkoutUrl=x',
    'limit=1&limit=2',
    'settlementStatus=REVIEW&settlementStatus=UNKNOWN',
    'orderId[a]=1',
  ])
    assert.equal(
      (await fetch(base + '?' + query, { headers: adminHeaders })).status,
      400,
      query,
    );
  for (const path of ['/bad', '/' + randomUUID() + '?extra=1'])
    assert.equal(
      (await fetch(base + path, { headers: adminHeaders })).status,
      400,
      path,
    );
  assert.equal(calls, 0);
});
test('only administrators reach payment reads, before input validation', async (t) => {
  let calls = 0;
  const base = await start(t, {
    ...empty,
    async list() {
      calls++;
      return [];
    },
  });
  for (const [token, status] of [
    ['', 401],
    ['invalid', 401],
    ['USER', 403],
    ['ADMIN', 200],
    ['SUPER_ADMIN', 200],
  ] as const) {
    const response = await fetch(base, {
      headers: token ? { Authorization: 'Bearer ' + token } : {},
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls, 2);
  assert.equal(
    (
      await fetch(base + '/bad?role=SUPER_ADMIN', {
        headers: { Authorization: 'Bearer USER' },
      })
    ).status,
    403,
  );
});
test('payment details use the attempt UUID and return a safe missing response', async (t) => {
  const id = randomUUID();
  let received = '';
  const base = await start(t, {
    ...empty,
    async findById(value) {
      received = value;
      return null;
    },
  });
  const response = await fetch(base + '/' + id, { headers: adminHeaders });
  assert.equal(response.status, 404);
  assert.equal(received, id);
  assert.deepEqual(await response.json(), {
    error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
  });
});
test('unexpected errors never expose financial details or database credentials', async (t) => {
  for (const error of [
    new Error('private-checkout-ciphertext'),
    new AppError(403, 'FORBIDDEN', 'Forbidden'),
  ]) {
    const fail = async () => {
      throw error;
    };
    const base = await start(t, { list: fail, findById: fail });
    for (const path of ['', '/' + randomUUID()]) {
      const response = await fetch(base + path, { headers: adminHeaders });
      assert.equal(response.status, error instanceof AppError ? 403 : 500);
      const value = await response.json();
      assert.ok(!JSON.stringify(value).includes('private'));
      assert.equal(
        value.error.code,
        error instanceof AppError ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR',
      );
    }
  }
});
test('admin payment management exposes no financial mutations or raw callback routes', async (t) => {
  const base = await start(t);
  const id = randomUUID();
  for (const [method, path] of [
    ['POST', ''],
    ['PATCH', '/' + id],
    ['DELETE', '/' + id],
    ['POST', '/' + id + '/capture'],
    ['POST', '/' + id + '/void'],
    ['POST', '/' + id + '/refund'],
    ['POST', '/' + id + '/retry'],
    ['GET', '/' + id + '/events'],
    ['GET', '/' + id + '/checkout'],
  ])
    assert.equal(
      (await fetch(base + path, { method, headers: adminHeaders })).status,
      404,
    );
});
