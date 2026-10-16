import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createApp } from '../src/app.ts';
import type { TripSearchService } from '../src/services/tripSearchService.ts';
import { cairoDayBounds } from '../src/utils/cairoTime.ts';

async function startServer(t: TestContext, service: TripSearchService) {
  const server = createApp([], { tripSearch: service }).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return 'http://127.0.0.1:' + address.port + '/api/v1/trips/search';
}
const origin = randomUUID(),
  destination = randomUUID();
const valid =
  '?originCityId=' +
  origin +
  '&destinationStationId=' +
  destination +
  '&travelDate=2099-01-01';
test('trip search forwards city/station filters and bounded pagination with Cairo date metadata', async (t) => {
  let received: unknown;
  const url = await startServer(t, {
    async search(input) {
      received = input;
      return [];
    },
  });
  const response = await fetch(url + valid + '&limit=5&offset=2');
  assert.equal(response.status, 200);
  assert.deepEqual(received, {
    originCityId: origin,
    destinationStationId: destination,
    travelDate: '2099-01-01',
    limit: 5,
    offset: 2,
  });
  assert.deepEqual(await response.json(), {
    data: [],
    pagination: { limit: 5, offset: 2 },
    search: { travelDate: '2099-01-01', timeZone: 'Africa/Cairo' },
  });
  assert.equal(
    (
      await fetch(
        url +
          '?originStationId=' +
          origin +
          '&destinationCityId=' +
          destination +
          '&travelDate=2099-01-01',
      )
    ).status,
    200,
  );
});
test('trip search rejects missing, ambiguous, invalid and repeated filters before querying', async (t) => {
  let calls = 0;
  const url = await startServer(t, {
    async search() {
      calls++;
      return [];
    },
  });
  for (const query of [
    '',
    '?travelDate=2099-01-01',
    valid.replace('2099-01-01', '2099-02-30'),
    valid.replace('2099-01-01', '2099-1-1'),
    valid.replace('2099-01-01', '9999-12-31'),
    valid.replace(origin, 'bad'),
    valid + '&originStationId=' + randomUUID(),
    valid + '&destinationCityId=' + randomUUID(),
    valid + '&travelDate=2099-01-02',
    valid + '&limit=0',
    valid + '&limit=101',
    valid + '&offset=-1',
    valid + '&status=CANCELLED',
    '?originStationId=' +
      origin +
      '&destinationStationId=' +
      origin +
      '&travelDate=2099-01-01',
  ]) {
    const response = await fetch(url + query);
    assert.equal(response.status, 400, query);
    assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  }
  assert.equal(calls, 0);
});
test('trip search errors never expose database details', async (t) => {
  const url = await startServer(t, {
    async search() {
      throw Error('private database details');
    },
  });
  const response = await fetch(url + valid);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
for (const [date, start, end, hours] of [
  ['2026-01-15', '2026-01-14T22:00:00Z', '2026-01-15T22:00:00Z', 24],
  ['2026-04-24', '2026-04-23T22:00:00Z', '2026-04-24T21:00:00Z', 23],
  ['2026-10-29', '2026-10-28T21:00:00Z', '2026-10-29T22:00:00Z', 25],
] as const) {
  test(
    'Cairo day boundaries include the actual ' + hours + '-hour day on ' + date,
    () => {
      const bounds = cairoDayBounds(date);
      assert.deepEqual(bounds, { start, end });
      assert.equal(
        (Date.parse(bounds.end) - Date.parse(bounds.start)) / 3600000,
        hours,
      );
    },
  );
}

test('demo seed CLI refuses production before database access and hides credentials', () => {
  const script = fileURLToPath(
    new URL('../src/scripts/seed.ts', import.meta.url),
  );
  const result = spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    timeout: 5000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://demo:private-test-password@127.0.0.1:1/demo',
    },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Demo seed failed/);
  assert.ok(!result.stderr.includes('private-test-password'));
  assert.equal(result.stdout, '');
});
