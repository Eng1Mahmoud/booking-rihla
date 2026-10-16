import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import type { BusService, Bus } from '../src/services/busService.ts';

function fakeService(): BusService {
  return {
    async list() {
      return [];
    },
    async findById() {
      return null;
    },
    async listSeats() {
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
  const server = createApp([], { buses: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/buses';
}
const json = { 'Content-Type': 'application/json' };

test('bus creation normalizes plates, defaults active, and returns 201 with Location', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ plateNumber: ' abc   123 ', seatCount: 100 }),
  });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.deepEqual(data, {
    id: data.id,
    plateNumber: 'ABC 123',
    seatCount: 100,
    isActive: true,
  });
  assert.equal(response.headers.get('location'), '/api/v1/buses/' + data.id);
});

test('bus list filters parse true and false explicitly with bounded pagination', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.list = async (input) => {
    received = input;
    return [];
  };
  const url = await startServer(t, service);
  const response = await fetch(url + '?isActive=false&limit=5&offset=2');
  assert.equal(response.status, 200);
  assert.deepEqual(received, { isActive: false, limit: 5, offset: 2 });
  const all = await fetch(url);
  assert.deepEqual(await all.json(), {
    data: [],
    pagination: { limit: 20, offset: 0 },
  });
  for (const query of [
    'isActive=1',
    'isActive=FALSE',
    'isActive=true&isActive=false',
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'extra=1',
  ]) {
    const invalid = await fetch(url + '?' + query);
    assert.equal(invalid.status, 400, query);
  }
});

test('bus details and seat list use the supplied service and validate ids', async (t) => {
  const bus: Bus = {
    id: randomUUID(),
    plateNumber: 'ABC',
    seatCount: 1,
    isActive: false,
  };
  const seat = { id: randomUUID(), busId: bus.id, number: 1 };
  const service = fakeService();
  service.findById = async (id) => (id === bus.id ? bus : null);
  service.listSeats = async (id) => (id === bus.id ? [seat] : null);
  const url = await startServer(t, service);
  const found = await fetch(url + '/' + bus.id);
  assert.deepEqual(await found.json(), { data: bus });
  const seats = await fetch(url + '/' + bus.id + '/seats');
  assert.equal(seats.status, 200);
  assert.deepEqual(await seats.json(), { data: [seat] });
  for (const suffix of ['', '/seats']) {
    const invalid = await fetch(url + '/invalid' + suffix);
    assert.equal(invalid.status, 400);
    const missing = await fetch(url + '/' + randomUUID() + suffix);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'BUS_NOT_FOUND');
  }
});

test('bus PATCH forwards only provided fields without defaulting active', async (t) => {
  const bus: Bus = {
    id: randomUUID(),
    plateNumber: 'OLD',
    seatCount: 3,
    isActive: false,
  };
  let received: unknown;
  const service = fakeService();
  service.update = async (_id, input) => {
    received = input;
    return { ...bus, ...input };
  };
  const url = await startServer(t, service);
  const response = await fetch(url + '/' + bus.id, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ plateNumber: ' new ' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { plateNumber: 'NEW' });
  assert.equal((await response.json()).data.isActive, false);
});

test('invalid bus bodies and empty patches never reach the service', async (t) => {
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
  const valid = { plateNumber: 'ABC', seatCount: 2 };
  for (const body of [
    {},
    { ...valid, plateNumber: ' ' },
    { ...valid, plateNumber: 'x'.repeat(33) },
    { ...valid, seatCount: 0 },
    { ...valid, seatCount: 101 },
    { ...valid, seatCount: 1.5 },
    { ...valid, seatCount: '2' },
    { ...valid, isActive: 'true' },
    { ...valid, id: randomUUID() },
  ]) {
    const response = await fetch(url, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
  for (const body of [
    {},
    { seatCount: 0 },
    { isActive: null },
    { id: randomUUID() },
    { seats: [] },
  ]) {
    const response = await fetch(url + '/' + randomUUID(), {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('bus mutations validate UUIDs and require JSON bodies', async (t) => {
  const url = await startServer(t);
  for (const method of ['POST', 'PATCH']) {
    const target = method === 'POST' ? url : url + '/' + randomUUID();
    assert.equal((await fetch(target, { method, body: 'text' })).status, 415);
    assert.equal(
      (await fetch(target, { method, headers: json, body: '{"plateNumber":' }))
        .status,
      400,
    );
  }
  for (const method of ['PATCH', 'DELETE']) {
    const options = {
      method,
      ...(method === 'PATCH'
        ? { headers: json, body: JSON.stringify({ isActive: false }) }
        : {}),
    };
    assert.equal((await fetch(url + '/bad', options)).status, 400);
    const missing = await fetch(url + '/' + randomUUID(), options);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'BUS_NOT_FOUND');
  }
});

test('bus deletion returns an empty 204 and duplicate plates return a safe 409', async (t) => {
  const service = fakeService();
  service.remove = async (id) => ({
    id,
    plateNumber: 'ABC',
    seatCount: 1,
    isActive: true,
  });
  service.create = async () => {
    throw new AppError(
      409,
      'PLATE_NUMBER_EXISTS',
      'A bus with this plate number already exists',
    );
  };
  const url = await startServer(t, service);
  const removed = await fetch(url + '/' + randomUUID(), { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  const duplicate = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ plateNumber: 'ABC', seatCount: 1 }),
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).error.code, 'PLATE_NUMBER_EXISTS');
});

test('bus database failures never expose private details on any endpoint', async (t) => {
  const fail = async () => {
    throw Error('private database URL');
  };
  const url = await startServer(t, {
    list: fail,
    findById: fail,
    listSeats: fail,
    create: fail,
    update: fail,
    remove: fail,
  });
  for (const [method, target, body] of [
    ['GET', url, undefined],
    ['GET', url + '/' + randomUUID(), undefined],
    ['GET', url + '/' + randomUUID() + '/seats', undefined],
    ['POST', url, { plateNumber: 'ABC', seatCount: 2 }],
    ['PATCH', url + '/' + randomUUID(), { isActive: false }],
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
