import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import type { City, CityService } from '../src/services/cityService.ts';

function memoryCityService(initial: City[] = []): CityService {
  const cities = [...initial];
  return {
    async list({ limit, offset }) {
      return cities.slice(offset, offset + limit);
    },
    async findById(id) {
      return cities.find((city) => city.id === id) ?? null;
    },
    async create(input) {
      const city = { id: randomUUID(), ...input };
      cities.push(city);
      return city;
    },
  };
}

async function startServer(t: TestContext, service = memoryCityService()) {
  const server = createApp([], service).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/cities';
}

test('an empty city list returns JSON and bounded default pagination', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { limit: 20, offset: 0 },
  });
});

test('a created city trims names, gets a UUID and can be read by its Location', async (t) => {
  const url = await startServer(t);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nameAr: ' القاهرة ', nameEn: ' Cairo ' }),
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { data: City };
  assert.match(
    body.data.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(body.data.nameAr, 'القاهرة');
  assert.equal(body.data.nameEn, 'Cairo');
  assert.equal(
    response.headers.get('location'),
    '/api/v1/cities/' + body.data.id,
  );
  const found = await fetch(url + '/' + body.data.id);
  assert.equal(found.status, 200);
  assert.deepEqual(await found.json(), body);
});

test('pagination is validated and forwarded as numbers to the service', async (t) => {
  let received: unknown;
  const service = memoryCityService();
  service.list = async (query) => {
    received = query;
    return [];
  };
  const url = await startServer(t, service);
  const response = await fetch(url + '?limit=5&offset=10');
  assert.equal(response.status, 200);
  assert.deepEqual(received, { limit: 5, offset: 10 });
});

test('invalid pagination never queries the service', async (t) => {
  let calls = 0;
  const service = memoryCityService();
  service.list = async () => {
    calls++;
    return [];
  };
  const url = await startServer(t, service);
  for (const query of [
    'limit=0',
    'limit=101',
    'limit=1.5',
    'limit=abc',
    'limit=',
    'offset=-1',
    'offset=100001',
    'limit=1&limit=2',
    'extra=1',
  ]) {
    const response = await fetch(url + '?' + query);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(calls, 0);
});

test('invalid bodies and client-supplied ids never reach city creation', async (t) => {
  let calls = 0;
  const service = memoryCityService();
  service.create = async () => {
    calls++;
    throw new Error('Should not be called');
  };
  const url = await startServer(t, service);
  const invalid = [
    null,
    [],
    {},
    { nameAr: 'القاهرة' },
    { nameAr: ' ', nameEn: 'Cairo' },
    { nameAr: 1, nameEn: 'Cairo' },
    { nameAr: 'القاهرة', nameEn: 'x'.repeat(101) },
    { nameAr: 'القاهرة', nameEn: 'Cairo', id: randomUUID() },
  ];
  for (const input of invalid) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    assert.equal(response.status, 400);
  }
  assert.equal(calls, 0);
});

test('city creation requires JSON and malformed JSON uses the common error response', async (t) => {
  const url = await startServer(t);
  const textResponse = await fetch(url, { method: 'POST', body: 'Cairo' });
  assert.equal(textResponse.status, 415);
  assert.equal(
    (await textResponse.json()).error.code,
    'UNSUPPORTED_MEDIA_TYPE',
  );
  const malformed = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"nameEn":',
  });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
});

test('invalid UUIDs return 400 and missing cities return a distinct 404', async (t) => {
  const url = await startServer(t);
  const invalid = await fetch(url + '/not-a-uuid');
  assert.equal(invalid.status, 400);
  const missing = await fetch(url + '/' + randomUUID());
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), {
    error: { code: 'CITY_NOT_FOUND', message: 'City not found' },
  });
});

test('database failures on every city operation return safe JSON', async (t) => {
  const fail = async () => {
    throw new Error('private database password');
  };
  const url = await startServer(t, {
    list: fail,
    findById: fail,
    create: fail,
  });
  const responses = [
    await fetch(url),
    await fetch(url + '/' + randomUUID()),
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nameAr: 'القاهرة', nameEn: 'Cairo' }),
    }),
  ];
  for (const response of responses) {
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});
