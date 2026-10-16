import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import { AppError } from '../src/errors/AppError.ts';
import type { RouteService, Route } from '../src/services/routeService.ts';

function fakeService(): RouteService {
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
  const server = createApp([], { routes: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/routes';
}
const json = { 'Content-Type': 'application/json' };
const valid = {
  originStationId: randomUUID(),
  destinationStationId: randomUUID(),
  estimatedDurationMinutes: 180,
};

test('route creation defaults active and returns 201 with Location', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.deepEqual(data, { id: data.id, ...valid, isActive: true });
  assert.equal(response.headers.get('location'), '/api/v1/routes/' + data.id);
});
test('route filters parse both endpoints, active status and pagination', async (t) => {
  let received: unknown;
  const service = fakeService();
  service.list = async (input) => {
    received = input;
    return [];
  };
  const url = await startServer(t, service);
  const response = await fetch(
    url +
      '?originStationId=' +
      valid.originStationId +
      '&destinationStationId=' +
      valid.destinationStationId +
      '&isActive=false&limit=2&offset=1',
  );
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    originStationId: valid.originStationId,
    destinationStationId: valid.destinationStationId,
    isActive: false,
    limit: 2,
    offset: 1,
  });
  assert.deepEqual(await (await fetch(url)).json(), {
    data: [],
    pagination: { limit: 20, offset: 0 },
  });
  for (const query of [
    'originStationId=bad',
    'destinationStationId=bad',
    'isActive=0',
    'isActive=TRUE',
    'isActive=true&isActive=false',
    'originStationId=' +
      valid.originStationId +
      '&originStationId=' +
      valid.destinationStationId,
    'limit=0',
    'limit=101',
    'offset=-1',
    'offset=100001',
    'extra=1',
  ])
    assert.equal((await fetch(url + '?' + query)).status, 400, query);
});
test('route details return the stored route or a clear missing response', async (t) => {
  const route: Route = { id: randomUUID(), ...valid, isActive: false };
  const service = fakeService();
  service.findById = async (id) => (id === route.id ? route : null);
  const url = await startServer(t, service);
  assert.deepEqual(await (await fetch(url + '/' + route.id)).json(), {
    data: route,
  });
  assert.equal((await fetch(url + '/bad')).status, 400);
  const missing = await fetch(url + '/' + randomUUID());
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'ROUTE_NOT_FOUND');
});
test('route PATCH forwards only provided fields and preserves inactive state', async (t) => {
  const route: Route = { id: randomUUID(), ...valid, isActive: false };
  let received: unknown;
  const service = fakeService();
  service.update = async (_id, input) => {
    received = input;
    return { ...route, ...input };
  };
  const url = await startServer(t, service);
  const response = await fetch(url + '/' + route.id, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ estimatedDurationMinutes: 240 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(received, { estimatedDurationMinutes: 240 });
  assert.equal((await response.json()).data.isActive, false);
});
test('route validation rejects invalid endpoints, durations, readonly and empty edits before writes', async (t) => {
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
    { ...valid, originStationId: 'bad' },
    { ...valid, destinationStationId: valid.originStationId },
    ...[0, 10081, 1.5, '180', null].map((estimatedDurationMinutes) => ({
      ...valid,
      estimatedDurationMinutes,
    })),
    { ...valid, isActive: 'true' },
    { ...valid, id: randomUUID() },
    { ...valid, price: 100 },
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
    );
  for (const body of [
    {},
    { originStationId: 'bad' },
    {
      originStationId: valid.originStationId,
      destinationStationId: valid.originStationId,
    },
    { estimatedDurationMinutes: 0 },
    { isActive: null },
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
test('route mutations validate ids, missing records and JSON content types', async (t) => {
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
        ? { headers: json, body: JSON.stringify({ isActive: false }) }
        : {}),
    };
    assert.equal((await fetch(url + '/bad', options)).status, 400);
    const missing = await fetch(url + '/' + randomUUID(), options);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'ROUTE_NOT_FOUND');
  }
});
test('route deletion returns 204 and expected conflicts keep their safe error code', async (t) => {
  const service = fakeService();
  service.remove = async (id) => ({ id, ...valid, isActive: true });
  service.create = async () => {
    throw new AppError(
      409,
      'ROUTE_EXISTS',
      'A route in this direction already exists',
    );
  };
  const url = await startServer(t, service);
  const deleted = await fetch(url + '/' + randomUUID(), { method: 'DELETE' });
  assert.equal(deleted.status, 204);
  assert.equal(await deleted.text(), '');
  const conflict = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify(valid),
  });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'ROUTE_EXISTS');
});
test('route failures on every endpoint hide private database details', async (t) => {
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
