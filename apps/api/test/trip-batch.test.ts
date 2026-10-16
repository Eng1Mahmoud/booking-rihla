import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test, type TestContext } from 'node:test';
import { createCatalogApp, adminFetch } from './helpers/catalogAuth.ts';
import { tripBatchSchema } from '../src/schemas/tripBatchSchema.ts';
import { buildBatchDepartures } from '../src/utils/tripBatchDates.ts';
import type { TripBatchService } from '../src/services/tripBatchService.ts';
import { AppError } from '../src/errors/AppError.ts';

const valid = {
  routeId: randomUUID(),
  busId: randomUUID(),
  startDate: '2099-01-01',
  endDate: '2099-01-07',
  weekdays: [1, 2, 3, 4, 6, 7],
  departureTime: '09:00',
  durationMinutes: 180,
  pricePiastres: 30000,
};
async function start(t: TestContext, service: TripBatchService) {
  const server = createCatalogApp([], { tripBatches: service }).listen(
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
  return 'http://127.0.0.1:' + address.port + '/api/v1/trips/batch';
}
const json = { 'Content-Type': 'application/json' };

test('batch dates select inclusive ISO weekdays, keep chronological order and handle month/year changes', () => {
  const result = buildBatchDepartures(valid);
  assert.equal(result.length, 6);
  assert.ok(
    result.every((trip) => new Date(trip.departureAt).getUTCDay() !== 5),
  );
  assert.equal(result[0]!.date, '2099-01-01');
  assert.equal(result.at(-1)!.date, '2099-01-07');
  assert.equal(result[0]!.departureAt, '2099-01-01T07:00:00.000Z');
  assert.equal(result[0]!.arrivalAt, '2099-01-01T10:00:00.000Z');
  const crossing = buildBatchDepartures({
    ...valid,
    startDate: '2098-12-31',
    endDate: '2099-01-02',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });
  assert.deepEqual(
    crossing.map((trip) => trip.date),
    ['2098-12-31', '2099-01-01', '2099-01-02'],
  );
});
test('Cairo batches preserve local departure time across DST and measure duration as elapsed minutes', () => {
  const trips = buildBatchDepartures(
    {
      ...valid,
      startDate: '2026-04-23',
      endDate: '2026-04-25',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      departureTime: '23:00',
      durationMinutes: 180,
    },
    0,
  );
  assert.equal(
    Date.parse(trips[1]!.departureAt) - Date.parse(trips[0]!.departureAt),
    23 * 60 * 60 * 1000,
  );
  assert.ok(
    trips.every(
      (trip) =>
        Date.parse(trip.arrivalAt) - Date.parse(trip.departureAt) ===
        180 * 60000,
    ),
  );
  for (const [date, time] of [
    ['2026-04-24', '00:30'],
    ['2026-10-29', '23:30'],
  ]) {
    assert.throws(
      () =>
        buildBatchDepartures(
          {
            ...valid,
            startDate: date!,
            endDate: date!,
            weekdays: [1, 2, 3, 4, 5, 6, 7],
            departureTime: time!,
          },
          0,
        ),
      (error) =>
        error instanceof AppError && error.code === 'INVALID_DEPARTURE_TIME',
    );
  }
});
test('batch generation rejects empty weekday matches and past departures', () => {
  assert.throws(
    () =>
      buildBatchDepartures({
        ...valid,
        startDate: '2099-01-01',
        endDate: '2099-01-01',
        weekdays: [1],
      }),
    (error) => error instanceof AppError && error.code === 'NO_DEPARTURES',
  );
  assert.throws(
    () => buildBatchDepartures(valid, Date.parse('2100-01-01')),
    (error) => error instanceof AppError && error.code === 'VALIDATION_ERROR',
  );
});
test('batch schemas bound calendar ranges and reject duplicate weekdays, invalid dates/times and extra fields', () => {
  assert.ok(
    tripBatchSchema.safeParse({ ...valid, endDate: '2099-03-31' }).success,
  );
  for (const input of [
    { ...valid, endDate: '2099-04-01' },
    { ...valid, endDate: '2098-12-31' },
    { ...valid, startDate: '2099-02-29' },
    { ...valid, startDate: '2026-1-1' },
    { ...valid, weekdays: [] },
    { ...valid, weekdays: [1, 1] },
    { ...valid, weekdays: [0] },
    { ...valid, weekdays: [8] },
    { ...valid, weekdays: ['1'] },
    { ...valid, departureTime: '24:00' },
    { ...valid, departureTime: '9:00' },
    { ...valid, departureTime: '09:00+02:00' },
    { ...valid, durationMinutes: 0 },
    { ...valid, durationMinutes: 10081 },
    { ...valid, durationMinutes: 1.5 },
    { ...valid, pricePiastres: -1 },
    { ...valid, pricePiastres: 2147483648 },
    { ...valid, routeId: 'invalid' },
    { ...valid, busId: 'invalid' },
    { ...valid, timeZone: 'UTC' },
    { ...valid, status: 'CANCELLED' },
  ])
    assert.equal(
      tripBatchSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
});
test('batch HTTP endpoints forward validated input, separate preview/create and use the correct status', async (t) => {
  const calls: string[] = [];
  const service: TripBatchService = {
    async preview(input) {
      assert.deepEqual(input, valid);
      calls.push('preview');
      return {
        timeZone: 'Africa/Cairo',
        canCreate: true,
        totalTrips: 0,
        trips: [],
      };
    },
    async create(input) {
      assert.deepEqual(input, valid);
      calls.push('create');
      return { timeZone: 'Africa/Cairo', totalTrips: 0, trips: [] };
    },
  };
  const base = await start(t, service);
  for (const [suffix, status] of [
    ['/preview', 200],
    ['', 201],
  ] as const) {
    const response = await adminFetch(base + suffix, {
      method: 'POST',
      headers: json,
      body: JSON.stringify(valid),
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).data.timeZone, 'Africa/Cairo');
  }
  assert.deepEqual(calls, ['preview', 'create']);
});
test('invalid batch HTTP input never reaches the service, including unsupported query fields', async (t) => {
  let calls = 0;
  const unreachable = async () => {
    calls++;
    throw new Error('not reached');
  };
  const base = await start(t, { preview: unreachable, create: unreachable });
  for (const suffix of ['/preview', '']) {
    for (const body of [
      { ...valid, weekdays: [] },
      { ...valid, status: 'SCHEDULED' },
      {},
      null,
    ]) {
      const response = await adminFetch(base + suffix, {
        method: 'POST',
        headers: json,
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
    }
    assert.equal(
      (
        await adminFetch(base + suffix + '?extra=1', {
          method: 'POST',
          headers: json,
          body: JSON.stringify(valid),
        })
      ).status,
      400,
    );
    assert.equal(
      (await adminFetch(base + suffix, { method: 'POST', body: 'text' }))
        .status,
      415,
    );
  }
  assert.equal(calls, 0);
});
test('batch errors keep business codes and hide unexpected database details', async (t) => {
  for (const error of [
    new AppError(409, 'BUS_SCHEDULE_CONFLICT', 'Refresh the preview'),
    new Error('private-database-detail'),
  ]) {
    const fail = async () => {
      throw error;
    };
    const base = await start(t, { preview: fail, create: fail });
    for (const suffix of ['/preview', '']) {
      const response = await adminFetch(base + suffix, {
        method: 'POST',
        headers: json,
        body: JSON.stringify(valid),
      });
      assert.equal(response.status, error instanceof AppError ? 409 : 500);
      assert.equal(
        (await response.json()).error.code,
        error instanceof AppError
          ? 'BUS_SCHEDULE_CONFLICT'
          : 'INTERNAL_SERVER_ERROR',
      );
    }
  }
});
