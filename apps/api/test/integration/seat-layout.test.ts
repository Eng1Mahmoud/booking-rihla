import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createCatalogApp, adminFetch } from '../helpers/catalogAuth.ts';
import { db } from '../../src/prisma/db.ts';
import { busService } from '../../src/services/busService.ts';
import { tripService } from '../../src/services/tripService.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { AppError } from '../../src/errors/AppError.ts';
import { isCheckViolation } from '../../src/utils/databaseErrors.ts';

test('fixed templates preserve seats, appear in passenger APIs and freeze atomically once trips use a bus', async (t) => {
  const namespace = 'fixed-layout-' + randomUUID();
  const data = buildDemoData('2099-01-01', namespace);
  const extraBuses: string[] = [],
    extraTrips: string[] = [];
  const server = createCatalogApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of extraTrips)
        await db.orm.public.Trip.where({ id }).delete();
      for (const trip of data.trips)
        await db.orm.public.Trip.where({ id: trip.id }).delete();
      for (const id of extraBuses)
        await db.orm.public.Bus.where({ id }).delete();
      for (const route of data.routes)
        await db.orm.public.Route.where({ id: route.id }).delete();
      for (const bus of data.buses)
        await db.orm.public.Bus.where({ id: bus.id }).delete();
      for (const station of data.stations)
        await db.orm.public.Station.where({ id: station.id }).delete();
      for (const city of data.cities)
        await db.orm.public.City.where({ id: city.id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  const headers = { 'Content-Type': 'application/json' };
  await seedDemo('2099-01-01', namespace);
  const response = await adminFetch(base + '/buses', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plateNumber: 'FIX-' + randomUUID().slice(0, 12),
      seatCount: 5,
      seatLayout: 'STANDARD_2_2',
    }),
  });
  assert.equal(response.status, 201);
  const bus = (await response.json()).data;
  extraBuses.push(bus.id);
  assert.equal(bus.seatLayout, 'STANDARD_2_2');
  const originalSeats = await busService.listSeats(bus.id);
  assert.ok(originalSeats);
  // Choosing or clearing a template never regenerates physical seats.
  await busService.update(bus.id, { seatLayout: null });
  await busService.update(bus.id, { seatLayout: 'STANDARD_2_2', seatCount: 7 });
  assert.deepEqual(
    (await busService.listSeats(bus.id))!.slice(0, 5),
    originalSeats,
  );
  const seats = await busService.listSeats(bus.id);
  await assert.rejects(
    db.orm.public.Bus.where({ id: bus.id }).update({
      seatLayout: 'UNKNOWN' as 'STANDARD_2_2',
    }),
    (error) => isCheckViolation(error, 'Bus_seatLayout_check_04946dd7'),
  );
  const { routeId, departureAt, arrivalAt, pricePiastres, status } =
    data.trips[0]!;
  const fields = { routeId, departureAt, arrivalAt, pricePiastres, status };
  const templateTrip = { ...fields, busId: bus.id };
  const trip = await tripService.create(templateTrip);
  extraTrips.push(trip.id);
  for (const suffix of ['details', 'seats']) {
    const result = await fetch(base + '/trips/' + trip.id + '/' + suffix);
    assert.equal(result.status, 200);
    const body = (await result.json()).data;
    assert.equal(
      suffix === 'details' ? body.bus.seatLayout : body.seatLayout,
      'STANDARD_2_2',
    );
    assert.equal('layout' in body, false);
    assert.equal('cells' in body, false);
    if (suffix === 'seats')
      assert.deepEqual(
        body.seats.map((s: { id: string }) => s.id),
        seats!.map((s) => s.id),
      );
    assert.equal(JSON.stringify(body).includes('plateNumber'), false);
  }
  const search = await fetch(
    base +
      '/trips/search?travelDate=2099-01-01&originStationId=' +
      data.routes[0]!.originStationId +
      '&destinationStationId=' +
      data.routes[0]!.destinationStationId,
  );
  assert.equal(search.status, 200);
  assert.equal(
    (await search.json()).data.find((row: { id: string }) => row.id === trip.id)
      .bus.seatLayout,
    'STANDARD_2_2',
  );
  const patch = (input: unknown) =>
    adminFetch(base + '/buses/' + bus.id, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(input),
    });
  for (const input of [
    { seatLayout: null },
    { seatCount: 8 },
    { seatLayout: null, plateNumber: 'SHOULD ROLL BACK' },
  ]) {
    const rejected = await patch(input);
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).error.code, 'BUS_HAS_TRIPS');
  }
  assert.equal(
    (await busService.findById(bus.id))!.plateNumber,
    bus.plateNumber,
  );
  assert.deepEqual(await busService.listSeats(bus.id), seats);
  assert.equal(
    (await patch({ seatLayout: 'STANDARD_2_2', seatCount: 7 })).status,
    200,
  );
  // Historical or cancelled departures also keep their numbered seating stable.
  await db.orm.public.Trip.where({ id: trip.id }).update({
    status: 'CANCELLED',
    departureAt: '2020-01-01T00:00:00Z',
    arrivalAt: '2020-01-01T03:00:00Z',
  });
  assert.equal((await patch({ seatLayout: null })).status, 409);
  // A previously unclassified bus with trips cannot acquire a guessed physical map.
  await assert.rejects(
    busService.update(data.buses[0]!.id, { seatLayout: 'STANDARD_2_2' }),
    (error) => error instanceof AppError && error.code === 'BUS_HAS_TRIPS',
  );
  assert.equal(
    (await busService.findById(data.buses[0]!.id))!.seatLayout,
    null,
  );
  // Trip creation and template changes contend on the same bus row lock.
  const racingBus = await busService.create({
    plateNumber: 'RACE-' + randomUUID().slice(0, 12),
    seatCount: 4,
    isActive: true,
    seatLayout: 'STANDARD_2_2',
  });
  extraBuses.push(racingBus.id);
  const [scheduled, changed] = await Promise.allSettled([
    tripService.create({ ...templateTrip, busId: racingBus.id }),
    busService.update(racingBus.id, { seatLayout: null }),
  ]);
  assert.equal(scheduled.status, 'fulfilled');
  if (scheduled.status === 'fulfilled') extraTrips.push(scheduled.value.id);
  if (changed.status === 'rejected')
    assert.ok(
      changed.reason instanceof AppError &&
        changed.reason.code === 'BUS_HAS_TRIPS',
    );
  const frozen = (await busService.findById(racingBus.id))!.seatLayout;
  assert.equal(frozen, changed.status === 'fulfilled' ? null : 'STANDARD_2_2');
  await assert.rejects(
    busService.update(racingBus.id, {
      seatLayout: frozen ? null : 'STANDARD_2_2',
    }),
    (error) => error instanceof AppError && error.code === 'BUS_HAS_TRIPS',
  );
  const oldRoute = await adminFetch(base + '/buses/' + bus.id + '/layout');
  assert.equal(oldRoute.status, 404);
});
