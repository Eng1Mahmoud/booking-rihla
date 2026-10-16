import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import type { TripService, Trip } from '../src/services/tripService.ts';

function fakeService(): TripService {
  return {
    async list() {
      return [];
    },
    async findById() {
      return null;
    },
    async create(input) {
      return { id: randomUUID(), ...input };
    },
    async update() {
      return null;
    },
    async remove() {
      return null;
    },
  };
}
async function startServer(t: TestContext, service = fakeService()) {
  const server = createApp([], { trips: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/trips';
}
const json = { 'Content-Type': 'application/json' };
const valid = {
  routeId: randomUUID(),
  busId: randomUUID(),
  departureAt: '2099-01-01T10:00:00+02:00',
  arrivalAt: '2099-01-01T13:00:00+02:00',
  pricePiastres: 25000,
};
const normalized = {
  ...valid,
  departureAt: '2099-01-01T08:00:00.000Z',
  arrivalAt: '2099-01-01T11:00:00.000Z',
};

test('trip creation normalizes timezone instants, defaults scheduled, and returns Location', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.deepEqual(data, { id: data.id, ...normalized, status: 'SCHEDULED' });
  assert.equal(response.headers.get('location'), '/api/v1/trips/' + data.id);
});
test('trip list validates combined filters and bounded pagination', async (t) => {
  const service = fakeService();
  let received: unknown;
  service.list = async (input) => {
    received = input;
    return [];
  };
  const url = await startServer(t, service);
  const response = await fetch(
    url +
      '?routeId=' +
      valid.routeId +
      '&busId=' +
      valid.busId +
      '&status=CANCELLED&limit=5&offset=2',
  );
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    routeId: valid.routeId,
    busId: valid.busId,
    status: 'CANCELLED',
    limit: 5,
    offset: 2,
  });
  assert.deepEqual(await (await fetch(url)).json(), {
    data: [],
    pagination: { limit: 20, offset: 0 },
  });
  for (const query of [
    'routeId=bad',
    'busId=bad',
    'status=scheduled',
    'status=COMPLETED',
    'status=SCHEDULED&status=CANCELLED',
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'extra=1',
  ])
    assert.equal((await fetch(url + '?' + query)).status, 400, query);
});
test('trip details and missing responses use the supplied service', async (t) => {
  const trip: Trip = { id: randomUUID(), ...normalized, status: 'CANCELLED' };
  const service = fakeService();
  service.findById = async (id) => (id === trip.id ? trip : null);
  const url = await startServer(t, service);
  assert.deepEqual(await (await fetch(url + '/' + trip.id)).json(), {
    data: trip,
  });
  assert.equal((await fetch(url + '/bad')).status, 400);
  const missing = await fetch(url + '/' + randomUUID());
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'TRIP_NOT_FOUND');
});
test('trip PATCH preserves omitted cancellation, times and references', async (t) => {
  const trip: Trip = { id: randomUUID(), ...normalized, status: 'CANCELLED' };
  let received: unknown;
  const service = fakeService();
  service.update = async (_id, input) => {
    received = input;
    return { ...trip, ...input };
  };
  const url = await startServer(t, service);
  const response = await fetch(url + '/' + trip.id, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ pricePiastres: 0 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { pricePiastres: 0 });
  assert.deepEqual((await response.json()).data, { ...trip, pricePiastres: 0 });
});
test('invalid trip data never reaches a write service', async (t) => {
  let calls = 0;
  const service = fakeService();
  service.create = async () => {
    calls++;
    throw Error('not reached');
  };
  service.update = async () => {
    calls++;
    return null;
  };
  const url = await startServer(t, service);
  for (const body of [
    {},
    { ...valid, routeId: 'bad' },
    { ...valid, busId: 'bad' },
    ...[-1, 2147483648, 1.5, '25000', null].map((pricePiastres) => ({
      ...valid,
      pricePiastres,
    })),
    ...[
      '2099-01-01T10:00:00',
      '2099-02-30T10:00:00Z',
      'bad',
      '2099-01-01T10:00:00.1234Z',
    ].map((departureAt) => ({ ...valid, departureAt })),
    { ...valid, arrivalAt: valid.departureAt },
    { ...valid, arrivalAt: '2099-01-01T07:00:00Z' },
    { ...valid, status: 'COMPLETED' },
    { ...valid, id: randomUUID() },
    { ...valid, price: 250 },
  ])
    assert.equal(
      (
        await fetch(url, {
          method: 'POST',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
      JSON.stringify(body),
    );
  for (const body of [
    {},
    { departureAt: 'bad' },
    { status: null },
    { pricePiastres: -1 },
    { ...normalized, arrivalAt: normalized.departureAt },
    { id: randomUUID() },
  ])
    assert.equal(
      (
        await fetch(url + '/' + randomUUID(), {
          method: 'PATCH',
          headers: json,
          body: JSON.stringify(body),
        })
      ).status,
      400,
    );
  assert.equal(calls, 0);
});
test('trip mutations validate ids, JSON content type and missing records', async (t) => {
  const url = await startServer(t);
  for (const method of ['POST', 'PATCH']) {
    const target = method === 'POST' ? url : url + '/' + randomUUID();
    assert.equal((await fetch(target, { method, body: 'text' })).status, 415);
    assert.equal(
      (await fetch(target, { method, headers: json, body: '{' })).status,
      400,
    );
  }
  for (const method of ['PATCH', 'DELETE']) {
    const options = {
      method,
      ...(method === 'PATCH'
        ? { headers: json, body: JSON.stringify({ status: 'CANCELLED' }) }
        : {}),
    };
    assert.equal((await fetch(url + '/bad', options)).status, 400);
    const missing = await fetch(url + '/' + randomUUID(), options);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'TRIP_NOT_FOUND');
  }
});
test('trip deletion returns empty 204 and scheduling conflicts keep safe codes', async (t) => {
  const service = fakeService();
  service.remove = async (id) => ({ id, ...normalized, status: 'SCHEDULED' });
  service.create = async () => {
    throw new AppError(
      409,
      'BUS_SCHEDULE_CONFLICT',
      'The bus already has a scheduled trip during this interval',
    );
  };
  const url = await startServer(t, service);
  const removed = await fetch(url + '/' + randomUUID(), { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  const conflict = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'BUS_SCHEDULE_CONFLICT');
});
test('trip failures on every endpoint hide database details', async (t) => {
  const fail = async () => {
    throw Error('private connection details');
  };
  const url = await startServer(t, {
    list: fail,
    findById: fail,
    create: fail,
    update: fail,
    remove: fail,
  });
  for (const [method, target, body] of [
    ['GET', url, undefined],
    ['GET', url + '/' + randomUUID(), undefined],
    ['POST', url, valid],
    ['PATCH', url + '/' + randomUUID(), { status: 'CANCELLED' }],
    ['DELETE', url + '/' + randomUUID(), undefined],
  ] as const) {
    const response = await fetch(target, {
      method,
      ...(body ? { headers: json, body: JSON.stringify(body) } : {}),
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
