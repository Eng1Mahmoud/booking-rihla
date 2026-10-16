import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createCatalogApp, adminFetch } from '../helpers/catalogAuth.ts';
import { db } from '../../src/prisma/db.ts';
import { busService } from '../../src/services/busService.ts';
import { tripService } from '../../src/services/tripService.ts';
import { buildBatchDepartures } from '../../src/utils/tripBatchDates.ts';
import type { TripBatchInput } from '../../src/schemas/tripBatchSchema.ts';

test('batch previews do not persist; complete creation rechecks conflicts and serializes with other scheduling writes', async (t) => {
  const buses: string[] = [],
    stations: string[] = [];
  const cities: string[] = [],
    routes: string[] = [];
  const server = createCatalogApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const busId of buses)
        await db.orm.public.Trip.where({ busId }).deleteAll();
      for (const id of buses) await db.orm.public.Bus.where({ id }).delete();
      for (const id of routes) await db.orm.public.Route.where({ id }).delete();
      for (const id of stations)
        await db.orm.public.Station.where({ id }).delete();
      for (const id of cities) await db.orm.public.City.where({ id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/trips/batch';
  const headers = { 'Content-Type': 'application/json' };
  const cityId = (
    await db.orm.public.City.create({
      nameAr: 'مدينة اختبار',
      nameEn: 'Batch ' + randomUUID(),
    })
  ).id;
  cities.push(cityId);
  for (const name of ['A', 'B'])
    stations.push(
      (
        await db.orm.public.Station.create({
          cityId,
          nameAr: name,
          nameEn: name,
        })
      ).id,
    );
  const routeId = (
    await db.orm.public.Route.create({
      originStationId: stations[0]!,
      destinationStationId: stations[1]!,
      estimatedDurationMinutes: 180,
    })
  ).id;
  routes.push(routeId);
  async function newBus() {
    const bus = await busService.create({
      plateNumber: 'BATCH-' + randomUUID().slice(0, 12),
      seatCount: 4,
      isActive: true,
      seatLayout: 'STANDARD_2_2',
    });
    buses.push(bus.id);
    return bus.id;
  }
  const input: TripBatchInput = {
    routeId,
    busId: await newBus(),
    startDate: '2099-01-01',
    endDate: '2099-01-03',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    departureTime: '09:00',
    durationMinutes: 180,
    pricePiastres: 30000,
  };
  const send = (suffix: string, body: object = input) =>
    adminFetch(base + suffix, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  const rows = (busId = input.busId) =>
    db.orm.public.Trip.where({ busId })
      .orderBy((trip) => trip.departureAt.asc())
      .all();
  async function expectError(response: Response, status: number, code: string) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  const firstPreview = await send('/preview');
  assert.equal(firstPreview.status, 200);
  const preview = (await firstPreview.json()).data;
  assert.equal(preview.canCreate, true);
  assert.equal(preview.totalTrips, 3);
  assert.ok(
    preview.trips.every(
      (trip: { conflicts: unknown[]; id?: string }) =>
        trip.conflicts.length === 0 && trip.id === undefined,
    ),
  );
  assert.equal((await rows()).length, 0);
  assert.deepEqual((await (await send('/preview')).json()).data, preview);
  // A new conflict added after preview must invalidate confirmation without inserting the earlier free day.
  const { date, ...middle } = buildBatchDepartures(input)[1]!;
  assert.equal(date, '2099-01-02');
  const conflict = await tripService.create(middle);
  const stale = await send('');
  await expectError(stale, 409, 'BUS_SCHEDULE_CONFLICT');
  assert.deepEqual(
    (await rows()).map((trip) => trip.id),
    [conflict.id],
  );
  const blocked = (await (await send('/preview')).json()).data;
  assert.equal(blocked.canCreate, false);
  assert.deepEqual(
    blocked.trips.map(
      (trip: { conflicts: unknown[] }) => trip.conflicts.length,
    ),
    [0, 1, 0],
  );
  assert.deepEqual(blocked.trips[1].conflicts, [
    { type: 'EXISTING_TRIP', tripId: conflict.id },
  ]);
  // Cancelled trips do not occupy a bus's operating schedule.
  await tripService.update(conflict.id, { status: 'CANCELLED' });
  assert.equal((await (await send('/preview')).json()).data.canCreate, true);
  const created = await send('');
  assert.equal(created.status, 201);
  const saved = (await created.json()).data;
  assert.equal(saved.totalTrips, 3);
  assert.equal(
    new Set(saved.trips.map((trip: { id: string }) => trip.id)).size,
    3,
  );
  assert.equal(saved.timeZone, 'Africa/Cairo');
  assert.deepEqual(
    saved.trips.map((trip: { departureAt: string }) => trip.departureAt),
    preview.trips.map((trip: { departureAt: string }) => trip.departureAt),
  );
  assert.ok(
    saved.trips.every(
      (trip: { status: string; pricePiastres: number }) =>
        trip.status === 'SCHEDULED' && trip.pricePiastres === 30000,
    ),
  );
  await expectError(await send(''), 409, 'BUS_SCHEDULE_CONFLICT');
  assert.equal((await rows()).length, 4);
  // Touching intervals are allowed. A 12:00 departure follows a 09:00-12:00 trip.
  const adjacent = await send('', { ...input, departureTime: '12:00' });
  assert.equal(adjacent.status, 201);
  assert.equal((await rows()).length, 7);
  const otherBus = await newBus();
  assert.equal((await send('', { ...input, busId: otherBus })).status, 201);
  const longBus = await newBus();
  const overlappingInput = { ...input, busId: longBus, durationMinutes: 1500 };
  const internal = (await (await send('/preview', overlappingInput)).json())
    .data;
  assert.equal(internal.canCreate, false);
  assert.deepEqual(internal.trips[0].conflicts, [
    { type: 'BATCH_TRIP', date: '2099-01-02' },
  ]);
  await expectError(
    await send('', overlappingInput),
    409,
    'BUS_SCHEDULE_CONFLICT',
  );
  assert.equal((await rows(longBus)).length, 0);
  // Parent validation is repeated at confirmation, not trusted from a prior preview.
  await busService.update(longBus, { isActive: false });
  for (const suffix of ['/preview', ''])
    await expectError(
      await send(suffix, { ...input, busId: longBus }),
      409,
      'BUS_INACTIVE',
    );
  await busService.update(longBus, { isActive: true });
  await db.orm.public.Route.where({ id: routeId }).update({ isActive: false });
  for (const suffix of ['/preview', ''])
    await expectError(
      await send(suffix, { ...input, busId: longBus }),
      409,
      'ROUTE_INACTIVE',
    );
  await db.orm.public.Route.where({ id: routeId }).update({ isActive: true });
  for (const suffix of ['/preview', '']) {
    await expectError(
      await send(suffix, { ...input, busId: randomUUID() }),
      404,
      'BUS_NOT_FOUND',
    );
    await expectError(
      await send(suffix, { ...input, routeId: randomUUID() }),
      404,
      'ROUTE_NOT_FOUND',
    );
    await expectError(
      await send(suffix, {
        ...input,
        startDate: '2020-01-01',
        endDate: '2020-01-03',
      }),
      400,
      'VALIDATION_ERROR',
    );
    await expectError(
      await send(suffix, {
        ...input,
        startDate: '2099-01-01',
        endDate: '2099-01-01',
        weekdays: [1],
      }),
      400,
      'NO_DEPARTURES',
    );
  }
  // Two concurrent batches create exactly one complete group, never duplicate or split days.
  const racing = { ...input, busId: await newBus() };
  const race = await Promise.all([send('', racing), send('', racing)]);
  assert.deepEqual(race.map((response) => response.status).sort(), [201, 409]);
  assert.equal((await rows(racing.busId)).length, 3);
  // The existing single-trip API participates in the same scheduling lock.
  const mixed = { ...input, busId: await newBus() };
  const { date: mixedDate, ...single } = buildBatchDepartures(mixed)[1]!;
  assert.equal(mixedDate, '2099-01-02');
  const [batchResult, singleResult] = await Promise.all([
    send('', mixed),
    adminFetch(base.replace('/batch', ''), {
      method: 'POST',
      headers,
      body: JSON.stringify(single),
    }),
  ]);
  assert.deepEqual(
    [batchResult.status, singleResult.status].sort(),
    [201, 409],
  );
  assert.equal(
    (await rows(mixed.busId)).length,
    batchResult.status === 201 ? 3 : 1,
  );
  // Every row remains an ordinary independently editable Trip.
  const first = saved.trips[0],
    second = saved.trips[1];
  await tripService.update(first.id, { pricePiastres: 31000 });
  assert.equal((await tripService.findById(second.id))!.pricePiastres, 30000);
  const maxInput = { ...input, busId: await newBus(), endDate: '2099-03-31' };
  assert.equal(
    (await (await send('/preview', maxInput)).json()).data.totalTrips,
    90,
  );
  const maxCreated = await send('', maxInput);
  assert.equal(maxCreated.status, 201);
  assert.equal((await maxCreated.json()).data.totalTrips, 90);
  assert.equal((await rows(maxInput.busId)).length, 90);
});
