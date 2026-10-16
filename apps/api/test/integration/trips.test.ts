import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { busService } from '../../src/services/busService.ts';
import {
  isCheckViolation,
  isForeignKeyViolation,
} from '../../src/utils/databaseErrors.ts';
import type { CreateTripInput } from '../../src/schemas/tripSchema.ts';

test('Trip CRUD preserves timezone instants and enforces safe concurrent scheduling and parent guards in PostgreSQL', async (t) => {
  const server = createApp([]).listen(0, '127.0.0.1');
  const trips: string[] = [];
  const routes: string[] = [];
  const buses: string[] = [];
  const stations: string[] = [];
  const cities: string[] = [];
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of trips) await db.orm.public.Trip.where({ id }).delete();
      for (const id of routes) await db.orm.public.Route.where({ id }).delete();
      for (const id of buses) await db.orm.public.Bus.where({ id }).delete();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  const json = { 'Content-Type': 'application/json' };
  const city = await db.orm.public.City.create({
    nameAr: 'مدينة اختبار',
    nameEn: 'Trip test ' + randomUUID(),
  });
  cities.push(city.id);
  for (const nameEn of ['A', 'B', 'C']) {
    const station = await db.orm.public.Station.create({
      nameAr: 'محطة اختبار',
      nameEn,
      cityId: city.id,
    });
    stations.push(station.id);
  }
  const [a, b, c] = stations;
  assert.ok(a && b && c);
  for (const destinationStationId of [b, c]) {
    const route = await db.orm.public.Route.create({
      originStationId: a,
      destinationStationId,
      estimatedDurationMinutes: 180,
    });
    routes.push(route.id);
  }
  for (let i = 0; i < 2; i++) {
    const bus = await busService.create({
      plateNumber: randomUUID().slice(0, 20),
      seatCount: 3,
      isActive: true,
    });
    buses.push(bus.id);
  }
  const [routeId, otherRouteId] = routes;
  const [busId, otherBusId] = buses;
  assert.ok(routeId && otherRouteId && busId && otherBusId);
  const input: CreateTripInput = {
    routeId,
    busId,
    departureAt: '2099-01-01T10:00:00+02:00',
    arrivalAt: '2099-01-01T13:00:00+02:00',
    pricePiastres: 25000,
    status: 'SCHEDULED',
  };
  async function create(body: CreateTripInput) {
    const response = await fetch(base + '/trips', {
      method: 'POST',
      headers: json,
      body: JSON.stringify(body),
    });
    const result = await response.clone().json();
    if (response.status === 201) trips.push(result.data.id);
    return { response, result };
  }
  async function patch(id: string, body: object) {
    return await fetch(base + '/trips/' + id, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify(body),
    });
  }
  async function expectError(response: Response, status: number, code: string) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  const first = await create(input);
  assert.equal(first.response.status, 201);
  const id = first.result.data.id;
  assert.equal(first.response.headers.get('location'), '/api/v1/trips/' + id);
  assert.deepEqual(first.result.data, {
    ...input,
    id,
    departureAt: '2099-01-01T08:00:00.000Z',
    arrivalAt: '2099-01-01T11:00:00.000Z',
  });
  const stored = await db.orm.public.Trip.where({ id }).first();
  assert.ok(stored);
  assert.equal(Date.parse(stored.departureAt), Date.parse(input.departureAt));
  assert.equal(stored.pricePiastres, 25000);
  const found = await fetch(base + '/trips/' + id);
  assert.equal(found.status, 200);
  assert.deepEqual((await found.json()).data, first.result.data);
  await expectError(
    (await create(input)).response,
    409,
    'BUS_SCHEDULE_CONFLICT',
  );
  // Intervals are [departure, arrival): back-to-back trips are allowed without a turnaround buffer.
  const adjacent = await create({
    ...input,
    departureAt: '2099-01-01T11:00:00Z',
    arrivalAt: '2099-01-01T12:00:00Z',
  });
  assert.equal(adjacent.response.status, 201);
  const otherBus = await create({ ...input, busId: otherBusId });
  assert.equal(otherBus.response.status, 201);
  const concurrentInput = {
    ...input,
    departureAt: '2099-01-02T08:00:00Z',
    arrivalAt: '2099-01-02T10:00:00Z',
  };
  const concurrent = await Promise.all([
    create(concurrentInput),
    create({ ...concurrentInput, routeId: otherRouteId }),
  ]);
  assert.deepEqual(concurrent.map((r) => r.response.status).sort(), [201, 409]);
  assert.equal(
    concurrent.find((r) => r.response.status === 409)?.result.error.code,
    'BUS_SCHEDULE_CONFLICT',
  );
  await expectError(
    await patch(id, { arrivalAt: '2099-01-01T07:00:00Z' }),
    400,
    'VALIDATION_ERROR',
  );
  await expectError(
    await patch(id, { busId: otherBusId, pricePiastres: 999 }),
    409,
    'BUS_SCHEDULE_CONFLICT',
  );
  assert.equal(
    (await db.orm.public.Trip.where({ id }).first())?.pricePiastres,
    25000,
  );
  assert.equal((await db.orm.public.Trip.where({ id }).first())?.busId, busId);
  const cancelled = await patch(id, { status: 'CANCELLED' });
  assert.equal(cancelled.status, 200);
  assert.equal((await cancelled.json()).data.status, 'CANCELLED');
  const replacement = await create(input);
  assert.equal(replacement.response.status, 201);
  await expectError(
    await patch(id, { status: 'SCHEDULED' }),
    409,
    'BUS_SCHEDULE_CONFLICT',
  );
  assert.equal(
    (await db.orm.public.Trip.where({ id }).first())?.status,
    'CANCELLED',
  );
  for (const pricePiastres of [0, 2147483647]) {
    const changed = await patch(id, { pricePiastres });
    assert.equal(changed.status, 200);
    const data = (await changed.json()).data;
    assert.equal(data.pricePiastres, pricePiastres);
    assert.equal(data.status, 'CANCELLED');
  }
  const filtered = await fetch(
    base +
      '/trips?routeId=' +
      routeId +
      '&busId=' +
      busId +
      '&status=SCHEDULED',
  );
  assert.equal(filtered.status, 200);
  const listed = (await filtered.json()).data;
  assert.ok(
    listed.every(
      (trip: { routeId: string; busId: string; status: string }) =>
        trip.routeId === routeId &&
        trip.busId === busId &&
        trip.status === 'SCHEDULED',
    ),
  );
  assert.ok(listed.length >= 2);
  const page = await fetch(
    base +
      '/trips?routeId=' +
      routeId +
      '&busId=' +
      busId +
      '&status=SCHEDULED&limit=1&offset=1',
  );
  assert.equal((await page.json()).data[0].id, listed[1].id);
  const empty = await fetch(base + '/trips?routeId=' + randomUUID());
  assert.deepEqual((await empty.json()).data, []);
  const later = {
    ...input,
    departureAt: '2099-01-03T08:00:00Z',
    arrivalAt: '2099-01-03T10:00:00Z',
  };
  for (const [field, code] of [
    ['routeId', 'ROUTE_NOT_FOUND'],
    ['busId', 'BUS_NOT_FOUND'],
  ] as const) {
    await expectError(
      (await create({ ...later, [field]: randomUUID() })).response,
      404,
      code,
    );
    await expectError(await patch(id, { [field]: randomUUID() }), 404, code);
  }
  await db.orm.public.Route.where({ id: routeId }).update({ isActive: false });
  await expectError((await create(later)).response, 409, 'ROUTE_INACTIVE');
  // Cancellation remains possible after a parent is deactivated.
  assert.equal(
    (await patch(replacement.result.data.id, { status: 'CANCELLED' })).status,
    200,
  );
  await expectError(
    await patch(replacement.result.data.id, { status: 'SCHEDULED' }),
    409,
    'ROUTE_INACTIVE',
  );
  await db.orm.public.Route.where({ id: routeId }).update({ isActive: true });
  await db.orm.public.Bus.where({ id: busId }).update({ isActive: false });
  await expectError((await create(later)).response, 409, 'BUS_INACTIVE');
  await db.orm.public.Bus.where({ id: busId }).update({ isActive: true });
  for (const [path, body, code] of [
    ['/buses/' + busId, { seatCount: 4 }, 'BUS_HAS_TRIPS'],
    ['/routes/' + routeId, { destinationStationId: c }, 'ROUTE_HAS_TRIPS'],
  ] as const) {
    await expectError(
      await fetch(base + path, {
        method: 'PATCH',
        headers: json,
        body: JSON.stringify(body),
      }),
      409,
      code,
    );
  }
  assert.equal(
    (
      await fetch(base + '/routes/' + routeId, {
        method: 'PATCH',
        headers: json,
        body: JSON.stringify({ estimatedDurationMinutes: 200 }),
      })
    ).status,
    200,
  );
  for (const [path, code] of [
    ['/buses/' + busId, 'BUS_IN_USE'],
    ['/routes/' + routeId, 'ROUTE_IN_USE'],
  ] as const)
    await expectError(
      await fetch(base + path, { method: 'DELETE' }),
      409,
      code,
    );
  await assert.rejects(
    db.orm.public.Trip.create({ ...later, busId: randomUUID() }),
    isForeignKeyViolation,
  );
  await assert.rejects(
    db.orm.public.Trip.where({ id }).update({ pricePiastres: -1 }),
    (error) => isCheckViolation(error, 'trip_price_range_00e5e7c7'),
  );
  await assert.rejects(
    db.orm.public.Trip.where({ id }).update({
      arrivalAt: '2099-01-01T07:00:00Z',
    }),
    (error) => isCheckViolation(error, 'trip_time_order_1a534dcc'),
  );
  await assert.rejects(
    db.transaction((tx) =>
      tx.execute(
        db.raw
          .sql`UPDATE "public"."Trip" SET "status" = 'INVALID' WHERE "id" = ${id}`
          .affectedCount()
          .build(),
      ),
    ),
    (error) => isCheckViolation(error, 'Trip_status_check_82227794'),
  );
  await expectError(
    (
      await create({
        ...input,
        departureAt: '2000-01-01T08:00:00Z',
        arrivalAt: '2000-01-01T10:00:00Z',
      })
    ).response,
    400,
    'VALIDATION_ERROR',
  );
  const past = await db.orm.public.Trip.create({
    ...input,
    departureAt: '2000-01-01T08:00:00Z',
    arrivalAt: '2000-01-01T10:00:00Z',
  });
  trips.push(past.id);
  await expectError(
    await patch(past.id, { pricePiastres: 0 }),
    409,
    'TRIP_DEPARTED',
  );
  const editA = await create({
    ...later,
    departureAt: '2099-01-04T08:00:00Z',
    arrivalAt: '2099-01-04T10:00:00Z',
  });
  const editB = await create({
    ...later,
    departureAt: '2099-01-04T11:00:00Z',
    arrivalAt: '2099-01-04T13:00:00Z',
  });
  assert.equal(editA.response.status, 201);
  assert.equal(editB.response.status, 201);
  const sameTime = {
    departureAt: '2099-01-05T08:00:00Z',
    arrivalAt: '2099-01-05T10:00:00Z',
  };
  const edits = await Promise.all([
    patch(editA.result.data.id, sameTime),
    patch(editB.result.data.id, sameTime),
  ]);
  assert.deepEqual(edits.map((r) => r.status).sort(), [200, 409]);
  const reassigned = await patch(id, {
    routeId: otherRouteId,
    busId: otherBusId,
  });
  assert.equal(reassigned.status, 200);
  const reassignedData = (await reassigned.json()).data;
  assert.equal(reassignedData.routeId, otherRouteId);
  assert.equal(reassignedData.busId, otherBusId);
  assert.equal(reassignedData.status, 'CANCELLED');
  assert.equal(
    (await patch(adjacent.result.data.id, { status: 'CANCELLED' })).status,
    200,
  );
  assert.equal(
    (await patch(adjacent.result.data.id, { status: 'SCHEDULED' })).status,
    200,
  );
  // Concurrent partial edits must validate against the latest locked trip row.
  const partialEdits = await Promise.all([
    patch(adjacent.result.data.id, { departureAt: '2099-01-01T11:30:00Z' }),
    patch(adjacent.result.data.id, { arrivalAt: '2099-01-01T11:15:00Z' }),
  ]);
  assert.deepEqual(
    partialEdits.map((response) => response.status).sort(),
    [200, 400],
  );
  for (const tripId of trips) {
    const removed = await fetch(base + '/trips/' + tripId, {
      method: 'DELETE',
    });
    assert.equal(removed.status, 204);
    assert.equal(await removed.text(), '');
  }
  await expectError(await fetch(base + '/trips/' + id), 404, 'TRIP_NOT_FOUND');
  await expectError(
    await patch(id, { pricePiastres: 100 }),
    404,
    'TRIP_NOT_FOUND',
  );
  await expectError(
    await fetch(base + '/trips/' + id, { method: 'DELETE' }),
    404,
    'TRIP_NOT_FOUND',
  );
  // Removing all trips releases catalog edit and deletion guards.
  assert.ok(await busService.update(busId, { seatCount: 4 }));
});
