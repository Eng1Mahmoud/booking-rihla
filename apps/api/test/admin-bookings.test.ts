import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createCatalogApp, adminFetch } from './helpers/catalogAuth.ts';
import type { AdminBookingService } from '../src/services/adminBookingService.ts';
import { AppError } from '../src/errors/AppError.ts';

async function start(t: TestContext, service: AdminBookingService) {
  const server = createCatalogApp([], { adminBookings: service }).listen(
    0,
    '127.0.0.1',
  );
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/admin/bookings';
}
const empty: AdminBookingService = {
  async list() {
    return [];
  },
  async findById() {
    return null;
  },
};
test('admin booking lists normalize exact searches, combine filters and use bounded pagination', async (t) => {
  let received: unknown;
  const base = await start(t, {
    ...empty,
    async list(input) {
      received = input;
      return [];
    },
  });
  const tripId = randomUUID(),
    userId = randomUUID();
  const query = new URLSearchParams({
    reference: ' bus-abcdef0123456789 ',
    email: ' CUSTOMER@EXAMPLE.TEST ',
    tripId,
    userId,
    travelDate: '2099-01-01',
    limit: '2',
    offset: '3',
  });
  const response = await adminFetch(base + '?' + query);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { limit: 2, offset: 3 },
  });
  assert.deepEqual(received, {
    reference: 'BUS-ABCDEF0123456789',
    email: 'customer@example.test',
    tripId,
    userId,
    travelDate: '2099-01-01',
    limit: 2,
    offset: 3,
  });
  await adminFetch(base);
  assert.deepEqual(received, { limit: 20, offset: 0 });
});
test('admin booking query validation rejects malformed, repeated and unsupported filters before database access', async (t) => {
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
    'tripId=invalid',
    'userId=invalid',
    'reference=BUS-123',
    'email=invalid',
    'email=',
    'travelDate=2099-02-29',
    'travelDate=0000-01-01',
    'travelDate=1999-12-31',
    'travelDate=9999-12-31',
    'travelDate=2099-1-1',
    'travelDate=2099-01-01T00:00:00Z',
    'status=PAID',
    'role=SUPER_ADMIN',
    'q=anything',
    'limit=1&limit=2',
    'tripId=' + randomUUID() + '&tripId=' + randomUUID(),
    'email[a]=x',
    'reference=BUS-%25',
  ]) {
    assert.equal((await adminFetch(base + '?' + query)).status, 400, query);
  }
  for (const path of ['/invalid', '/' + randomUUID() + '?extra=1'])
    assert.equal((await adminFetch(base + path)).status, 400, path);
  assert.equal(calls, 0);
});
test('admin booking details validate ids, delegate the id and return a safe missing response', async (t) => {
  let received = '';
  const id = randomUUID();
  const base = await start(t, {
    ...empty,
    async findById(value) {
      received = value;
      return null;
    },
  });
  const response = await adminFetch(base + '/' + id);
  assert.equal(response.status, 404);
  assert.equal(received, id);
  assert.deepEqual(await response.json(), {
    error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
  });
});
test('admin booking reads expose safe expected errors and conceal unexpected database details', async (t) => {
  for (const error of [
    new Error('private-db-secret'),
    new AppError(403, 'FORBIDDEN', 'Forbidden'),
  ]) {
    const fail = async () => {
      throw error;
    };
    const base = await start(t, { list: fail, findById: fail });
    for (const path of ['', '/' + randomUUID()]) {
      const response = await adminFetch(base + path);
      assert.equal(response.status, error instanceof AppError ? 403 : 500);
      const body = await response.json();
      assert.equal(
        body.error.code,
        error instanceof AppError ? 'FORBIDDEN' : 'INTERNAL_SERVER_ERROR',
      );
      assert.equal(JSON.stringify(body).includes('private-db-secret'), false);
    }
  }
});
test('admin booking routes provide no mutation or cancellation endpoints', async (t) => {
  const base = await start(t, empty);
  for (const [method, path] of [
    ['POST', ''],
    ['PATCH', '/' + randomUUID()],
    ['DELETE', '/' + randomUUID()],
    ['POST', '/' + randomUUID() + '/cancel'],
  ]) {
    assert.equal((await adminFetch(base + path, { method })).status, 404);
  }
});
