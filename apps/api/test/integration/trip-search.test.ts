import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { cairoDayBounds } from '../../src/utils/cairoTime.ts';

test('repeatable scoped seeds and passenger search enforce endpoints, Cairo bounds, active records and future departures', async (t) => {
  const namespace = 'test-' + randomUUID();
  const data = buildDemoData('2099-01-01', namespace);
  const extraTrips: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const id of [...extraTrips, ...data.trips.map((trip) => trip.id)])
        await db.orm.public.Trip.where({ id }).delete();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/trips/search';
  const seeded = await Promise.all([
    seedDemo('2099-01-01', namespace),
    seedDemo('2099-01-01', namespace),
  ]);
  assert.deepEqual(seeded[0]?.trips, seeded[1]?.trips);
  for (const bus of data.buses)
    assert.equal(
      (await db.orm.public.BusSeat.where({ busId: bus.id }).all()).length,
      20,
    );
  for (const route of data.routes)
    assert.equal(
      (await db.orm.public.Trip.where({ routeId: route.id }).all()).length,
      3,
    );
  const [cairo, alex] = data.cities;
  const [origin, destination] = data.stations;
  const route = data.routes[0];
  const bus = data.buses[0];
  assert.ok(cairo && alex && origin && destination && route && bus);
  async function search(query: string) {
    const response = await fetch(base + query);
    assert.equal(response.status, 200);
    return (await response.json()).data;
  }
  const cities =
    '?originCityId=' +
    cairo.id +
    '&destinationCityId=' +
    alex.id +
    '&travelDate=2099-01-01';
  const stations =
    '?originStationId=' +
    origin.id +
    '&destinationStationId=' +
    destination.id +
    '&travelDate=2099-01-01';
  const result = await search(cities);
  assert.equal(result.length, 1);
  assert.deepEqual(
    (await search(stations)).map((trip: { id: string }) => trip.id),
    result.map((trip: { id: string }) => trip.id),
  );
  assert.equal(result[0].route.originStation.city.nameEn, 'Cairo');
  assert.equal(result[0].route.destinationStation.nameAr, 'محرم بك');
  assert.deepEqual(result[0].bus, { id: bus.id, seatCount: 20 });
  assert.equal(result[0].pricePiastres, 25000);
  assert.ok(result[0].departureAt.endsWith('Z'));
  assert.equal(
    (
      await search(
        '?originCityId=' +
          alex.id +
          '&destinationCityId=' +
          cairo.id +
          '&travelDate=2099-01-01',
      )
    ).length,
    1,
  );
  assert.deepEqual(await search(cities.replace(cairo.id, randomUUID())), []);
  await db.orm.public.Bus.where({ id: bus.id }).update({ isActive: false });
  assert.deepEqual(await search(cities), []);
  await db.orm.public.Bus.where({ id: bus.id }).update({ isActive: true });
  await db.orm.public.Route.where({ id: route.id }).update({ isActive: false });
  assert.deepEqual(await search(cities), []);
  await db.orm.public.Route.where({ id: route.id }).update({ isActive: true });
  const seededTrip = result[0].id;
  await db.orm.public.Trip.where({ id: seededTrip }).update({
    status: 'CANCELLED',
  });
  assert.deepEqual(await search(cities), []);
  // Re-running seed never restores a cancellation or overwrites an operator's edit.
  await assert.rejects(
    seedDemo('2099-01-01', namespace),
    /conflicts with edited/,
  );
  assert.equal(
    (await db.orm.public.Trip.where({ id: seededTrip }).first())?.status,
    'CANCELLED',
  );
  await db.orm.public.Trip.where({ id: seededTrip }).update({
    status: 'SCHEDULED',
  });
  const bounds = cairoDayBounds('2099-01-01');
  for (const departureAt of [
    new Date(Date.parse(bounds.start) - 1).toISOString(),
    bounds.start,
    new Date(Date.parse(bounds.end) - 1).toISOString(),
    bounds.end,
  ]) {
    const trip = await db.orm.public.Trip.create({
      routeId: route.id,
      busId: bus.id,
      departureAt,
      arrivalAt: new Date(Date.parse(departureAt) + 3600000).toISOString(),
      pricePiastres: 0,
    });
    extraTrips.push(trip.id);
  }
  const bounded = await search(cities);
  assert.equal(bounded.length, 3);
  assert.equal(Date.parse(bounded[0].departureAt), Date.parse(bounds.start));
  assert.equal(Date.parse(bounded[2].departureAt), Date.parse(bounds.end) - 1);
  const page = await search(cities + '&limit=1&offset=1');
  assert.equal(page[0].id, bounded[1].id);
  const past = await db.orm.public.Trip.create({
    routeId: route.id,
    busId: bus.id,
    departureAt: '2000-01-01T08:00:00Z',
    arrivalAt: '2000-01-01T10:00:00Z',
    pricePiastres: 0,
  });
  extraTrips.push(past.id);
  assert.deepEqual(
    await search(cities.replace('2099-01-01', '2000-01-01')),
    [],
  );
});
