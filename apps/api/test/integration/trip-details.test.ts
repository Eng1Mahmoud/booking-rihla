import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';

test('passenger details and seats follow eligible trips and the assigned bus without creating allocations in PostgreSQL', async (t) => {
  const namespace = 'details-test-' + randomUUID();
  const data = buildDemoData('2099-01-01', namespace);
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const trip of data.trips)
        await db.orm.public.Trip.where({ id: trip.id }).delete();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/trips';
  await seedDemo('2099-01-01', namespace);
  const trip = data.trips[0],
    laterTrip = data.trips[3],
    otherTrip = data.trips[1];
  const bus = data.buses[0],
    otherBus = data.buses[1],
    route = data.routes[0];
  assert.ok(trip && laterTrip && otherTrip && bus && otherBus && route);
  async function read(id: string, suffix: string) {
    const response = await fetch(base + '/' + id + '/' + suffix);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()).data;
  }
  async function expectHidden(id: string) {
    for (const suffix of ['details', 'seats']) {
      const response = await fetch(base + '/' + id + '/' + suffix);
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: { code: 'TRIP_NOT_FOUND', message: 'Trip not found' },
      });
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
  const details = await read(trip.id, 'details');
  assert.equal(details.id, trip.id);
  assert.equal(details.pricePiastres, 25000);
  assert.equal(Date.parse(details.departureAt), Date.parse(trip.departureAt));
  assert.ok(details.departureAt.endsWith('Z'));
  assert.equal(details.route.originStation.nameAr, 'رمسيس');
  assert.equal(details.route.destinationStation.city.nameEn, 'Alexandria');
  assert.deepEqual(details.bus, { id: bus.id, seatCount: 20 });
  assert.ok(!JSON.stringify(details).includes('plateNumber'));
  const seats = await read(trip.id, 'seats');
  assert.equal(seats.tripId, trip.id);
  assert.equal(seats.busId, bus.id);
  assert.equal(seats.totalSeats, 20);
  assert.equal(seats.availableSeats, 20);
  assert.deepEqual(
    seats.seats.map((seat: { number: number }) => seat.number),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  assert.ok(
    seats.seats.every((seat: { isAvailable: boolean }) => seat.isAvailable),
  );
  const catalogSeats = await db.orm.public.BusSeat.where({ busId: bus.id })
    .orderBy((seat) => seat.number.asc())
    .all();
  assert.deepEqual(
    seats.seats.map((seat: { id: string }) => seat.id),
    catalogSeats.map((seat) => seat.id),
  );
  // A seat belongs to a bus; the same seat appears under two separate departures.
  const later = await read(laterTrip.id, 'seats');
  assert.equal(later.tripId, laterTrip.id);
  assert.deepEqual(later.seats, seats.seats);
  assert.deepEqual(await read(trip.id, 'seats'), seats);
  assert.equal(
    (await db.orm.public.Trip.where({ routeId: route.id }).all()).length,
    3,
  );
  assert.equal(
    (await db.orm.public.BusSeat.where({ busId: bus.id }).all()).length,
    20,
  );
  // After a valid bus reassignment the endpoint must return the new bus's seat ids.
  await db.orm.public.Trip.where({ id: otherTrip.id }).update({
    status: 'CANCELLED',
  });
  const reassigned = await fetch(base + '/' + trip.id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busId: otherBus.id }),
  });
  assert.equal(reassigned.status, 200);
  const moved = await read(trip.id, 'seats');
  assert.equal(moved.busId, otherBus.id);
  const otherSeats = await db.orm.public.BusSeat.where({ busId: otherBus.id })
    .orderBy((seat) => seat.number.asc())
    .all();
  assert.deepEqual(
    moved.seats.map((seat: { id: string }) => seat.id),
    otherSeats.map((seat) => seat.id),
  );
  assert.equal((await read(trip.id, 'details')).bus.id, otherBus.id);
  await db.orm.public.Trip.where({ id: trip.id }).update({
    busId: bus.id,
    status: 'CANCELLED',
  });
  await expectHidden(trip.id);
  assert.equal((await read(laterTrip.id, 'seats')).availableSeats, 20);
  await db.orm.public.Trip.where({ id: trip.id }).update({
    status: 'SCHEDULED',
  });
  await db.orm.public.Route.where({ id: route.id }).update({ isActive: false });
  await expectHidden(trip.id);
  await db.orm.public.Route.where({ id: route.id }).update({ isActive: true });
  await db.orm.public.Bus.where({ id: bus.id }).update({ isActive: false });
  await expectHidden(trip.id);
  await db.orm.public.Bus.where({ id: bus.id }).update({ isActive: true });
  await db.orm.public.Trip.where({ id: trip.id }).update({
    departureAt: '2000-01-01T08:00:00Z',
    arrivalAt: '2000-01-01T11:00:00Z',
  });
  await expectHidden(trip.id);
  // The existing management detail still reads cancelled/past trips for operators.
  const management = await fetch(base + '/' + trip.id);
  assert.equal(management.status, 200);
  assert.equal((await management.json()).data.id, trip.id);
  await expectHidden(randomUUID());
  await db.orm.public.Trip.where({ id: trip.id }).delete();
  await expectHidden(trip.id);
});
