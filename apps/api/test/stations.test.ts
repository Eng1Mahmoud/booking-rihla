import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import {
  createCatalogApp as createApp,
  adminFetch as fetch,
} from './helpers/catalogAuth.ts';
import type {
  Station,
  StationService,
} from '../src/services/stationService.ts';

function memoryService(initial: Station[] = []): StationService {
  const stations = [...initial];
  return {
    async list({ limit, offset, cityId }) {
      return stations
        .filter((s) => !cityId || s.cityId === cityId)
        .slice(offset, offset + limit);
    },
    async findById(id) {
      return stations.find((s) => s.id === id) ?? null;
    },
    async create(input) {
      const station = { id: randomUUID(), ...input };
      stations.push(station);
      return station;
    },
    async update(id, input) {
      const station = stations.find((s) => s.id === id);
      if (!station) return null;
      Object.assign(station, input);
      return station;
    },
    async remove(id) {
      const index = stations.findIndex((s) => s.id === id);
      return index < 0 ? null : stations.splice(index, 1)[0];
    },
  };
}
async function startServer(t: TestContext, service = memoryService()) {
  const server = createApp([], { stations: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/stations';
}
const json = { 'Content-Type': 'application/json' };

test('station CRUD uses UUIDs, trims names, preserves omitted fields, and deletes', async (t) => {
  const url = await startServer(t);
  const cityId = randomUUID();
  const created = await fetch(url, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ nameAr: ' رمسيس ', nameEn: ' Ramses ', cityId }),
  });
  assert.equal(created.status, 201);
  const body = await created.json();
  assert.match(body.data.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(body.data, {
    id: body.data.id,
    nameAr: 'رمسيس',
    nameEn: 'Ramses',
    cityId,
  });
  assert.equal(
    created.headers.get('location'),
    '/api/v1/stations/' + body.data.id,
  );
  const detail = await fetch(url + '/' + body.data.id);
  assert.equal(detail.status, 200);
  assert.deepEqual(await detail.json(), body);
  const updated = await fetch(url + '/' + body.data.id, {
    method: 'PATCH',
    headers: json,
    body: JSON.stringify({ nameEn: ' Ramses Updated ' }),
  });
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).data, {
    ...body.data,
    nameEn: 'Ramses Updated',
  });
  const removed = await fetch(url + '/' + body.data.id, { method: 'DELETE' });
  assert.equal(removed.status, 204);
  assert.equal(await removed.text(), '');
  const missing = await fetch(url + '/' + body.data.id);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'STATION_NOT_FOUND');
});

test('station lists filter by city and forward bounded numeric pagination', async (t) => {
  let received: unknown;
  const service = memoryService();
  service.list = async (query) => {
    received = query;
    return [];
  };
  const url = await startServer(t, service);
  const cityId = randomUUID();
  const response = await fetch(url + '?cityId=' + cityId + '&limit=2&offset=3');
  assert.equal(response.status, 200);
  assert.deepEqual(received, { cityId, limit: 2, offset: 3 });
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { cityId, limit: 2, offset: 3 },
  });
  const empty = await fetch(url);
  assert.deepEqual(await empty.json(), {
    data: [],
    pagination: { limit: 20, offset: 0 },
  });
});

test('invalid station query parameters do not call the service', async (t) => {
  let calls = 0;
  const service = memoryService();
  service.list = async () => {
    calls++;
    return [];
  };
  const url = await startServer(t, service);
  for (const query of [
    'cityId=bad',
    'limit=0',
    'limit=101',
    'limit=1.5',
    'offset=-1',
    'offset=100001',
    'cityId=' + randomUUID() + '&cityId=' + randomUUID(),
    'unknown=1',
  ]) {
    const response = await fetch(url + '?' + query);
    assert.equal(response.status, 400, query);
  }
  assert.equal(calls, 0);
});

test('invalid station bodies reject missing parent, bad names, empty patches and extra fields', async (t) => {
  let calls = 0;
  const service = memoryService();
  service.create = async () => {
    calls++;
    throw Error('not reached');
  };
  service.update = async () => {
    calls++;
    return null;
  };
  const url = await startServer(t, service);
  const cityId = randomUUID();
  const valid = { nameAr: 'رمسيس', nameEn: 'Ramses', cityId };
  for (const body of [
    { nameAr: 'رمسيس', nameEn: 'Ramses' },
    { ...valid, cityId: 'bad' },
    { ...valid, nameAr: ' ' },
    { ...valid, nameEn: 1 },
    { ...valid, nameEn: 'x'.repeat(101) },
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
    { cityId: 'bad' },
    { nameAr: '' },
    { nameEn: null },
    { id: randomUUID() },
    { other: 'x' },
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

test('station writes require JSON and malformed JSON follows the common handler', async (t) => {
  const url = await startServer(t);
  for (const method of ['POST', 'PATCH']) {
    const target = method === 'POST' ? url : url + '/' + randomUUID();
    const response = await fetch(target, { method, body: 'Ramses' });
    assert.equal(response.status, 415);
    const invalid = await fetch(target, {
      method,
      headers: json,
      body: '{"nameEn":',
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
  }
});

test('station ids are validated and missing records return distinct 404s', async (t) => {
  const url = await startServer(t);
  for (const method of ['GET', 'PATCH', 'DELETE']) {
    const options = {
      method,
      ...(method === 'PATCH'
        ? { headers: json, body: JSON.stringify({ nameEn: 'Ramses' }) }
        : {}),
    };
    const invalid = await fetch(url + '/invalid', options);
    assert.equal(invalid.status, 400);
    const missing = await fetch(url + '/' + randomUUID(), options);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'STATION_NOT_FOUND');
  }
});

test('unexpected errors on all station operations return generic JSON', async (t) => {
  const fail = async () => {
    throw Error('private database URL');
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
    ['POST', url, { nameAr: 'رمسيس', nameEn: 'Ramses', cityId: randomUUID() }],
    ['PATCH', url + '/' + randomUUID(), { nameEn: 'Ramses' }],
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
