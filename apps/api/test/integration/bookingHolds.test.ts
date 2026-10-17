import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';
import { expireBookingHolds } from '../../src/services/bookingHoldService.ts';

test('checkout holds expire without a worker, preserve history and serialize reallocation with cleanup', async (t) => {
  const namespace = 'hold-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [],
    tripIds = data.trips.map((t) => t.id);
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const tripId of tripIds) {
        await db.orm.public.Booking.where({ tripId }).deleteAll();
        await db.orm.public.Trip.where({ id: tripId }).delete();
      }
      for (const id of users) await db.orm.public.User.where({ id }).delete();
      for (const row of data.routes)
        await db.orm.public.Route.where({ id: row.id }).delete();
      for (const row of data.buses)
        await db.orm.public.Bus.where({ id: row.id }).delete();
      for (const row of data.stations)
        await db.orm.public.Station.where({ id: row.id }).delete();
      for (const row of data.cities)
        await db.orm.public.City.where({ id: row.id }).delete();
    } finally {
      await db.close();
    }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  await seedDemo('2099-01-01', namespace);
  async function account(role: 'USER' | 'SUPER_ADMIN' = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Hold test',
      email: randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash: 'not-a-login-hash',
      role,
      emailVerifiedAt: new Date().toISOString(),
    });
    users.push(user.id);
    const session = await db.orm.public.Session.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    return { user, token: await signAccessToken(user.id, session.id) };
  }
  const first = await account(),
    second = await account(),
    third = await account(),
    admin = await account('SUPER_ADMIN'),
    trip = data.trips[0]!,
    seats = data.seats
      .filter((s) => s.busId === trip.busId)
      .sort((a, b) => a.number - b.number);
  function request(path: string, token: string, method = 'GET', body?: object) {
    return fetch(base + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  const payload = (seatIds = [seats[0]!.id], tripId = trip.id) => ({
    tripId,
    contactPhone: '+201012345678',
    passengers: seatIds.map((seatId) => ({ seatId, name: 'Passenger' })),
  });
  const reserve = (token: string, body = payload()) =>
    request('/bookings', token, 'POST', body);
  async function availability(tripId = trip.id) {
    const r = await fetch(base + '/trips/' + tripId + '/seats');
    assert.equal(r.status, 200);
    return (await r.json()).data;
  }
  const before = Date.now(),
    created = await reserve(first.token, payload([seats[0]!.id, seats[1]!.id]));
  assert.equal(created.status, 201);
  const hold = (await created.json()).data;
  assert.equal(hold.status, 'PENDING_PAYMENT');
  assert.equal(hold.paymentRequired, true);
  assert.ok(Date.parse(hold.expiresAt) >= before + 600000);
  assert.ok(Date.parse(hold.expiresAt) <= Date.now() + 600000);
  assert.equal((await availability()).availableSeats, 18);
  assert.equal((await reserve(second.token)).status, 409);
  const read = await request('/bookings/' + hold.id, first.token);
  assert.equal((await read.json()).data.expiresAt, hold.expiresAt);
  for (const extra of [
    { expiresAt: '2099-01-01T00:00:00Z' },
    { status: 'RESERVED' },
    { paymentRequired: false },
  ])
    assert.equal(
      (await reserve(first.token, { ...payload([seats[2]!.id]), ...extra }))
        .status,
      400,
    );
  assert.equal(
    (await request('/bookings/' + hold.id, second.token)).status,
    404,
  );
  const past = new Date(Date.now() - 1000).toISOString();
  await db.orm.public.Booking.where({ id: hold.id }).update({
    expiresAt: past,
  });
  // Correct reads do not depend on a running expiry worker or mutate on GET.
  assert.equal((await availability()).availableSeats, 20);
  const expired = (
    await (await request('/bookings/' + hold.id, first.token)).json()
  ).data;
  assert.equal(expired.status, 'EXPIRED');
  assert.equal(expired.paymentRequired, false);
  assert.equal(expired.passengers.length, 2);
  assert.equal(
    (await db.orm.public.Booking.where({ id: hold.id }).first())!.status,
    'PENDING_PAYMENT',
  );
  const adminView = await request('/admin/bookings/' + hold.id, admin.token);
  assert.equal((await adminView.json()).data.status, 'EXPIRED');
  // Reallocation releases the expired allocation inside the same locked transaction.
  const next = await reserve(second.token);
  assert.equal(next.status, 201);
  const secondHold = (await next.json()).data;
  assert.equal(
    (await db.orm.public.Booking.where({ id: hold.id }).first())!.status,
    'EXPIRED',
  );
  const oldSeats = await db.orm.public.BookingSeat.where({
    bookingId: hold.id,
  }).all();
  assert.equal(oldSeats.length, 2);
  assert.ok(oldSeats.every((s) => s.releasedAt));
  assert.equal((await availability()).availableSeats, 19);
  assert.equal(
    (
      await db.orm.public.BookingSeat.where({
        tripId: trip.id,
        seatId: seats[0]!.id,
        releasedAt: null,
      }).all()
    ).length,
    1,
  );
  // Legacy RESERVED rows never expire and remain unavailable.
  const legacy = await db.orm.public.Booking.create({
    reference:
      'BUS-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(),
    userId: first.user.id,
    tripId: trip.id,
    contactPhone: '+201012345678',
    seatCount: 1,
    unitPricePiastres: 1,
    totalPiastres: 1n,
  });
  await db.orm.public.BookingSeat.create({
    bookingId: legacy.id,
    tripId: trip.id,
    seatId: seats[3]!.id,
    seatNumber: 4,
    passengerName: 'Legacy passenger',
  });
  await expireBookingHolds();
  assert.equal(
    (await db.orm.public.Booking.where({ id: legacy.id }).first())!.status,
    'RESERVED',
  );
  assert.equal((await availability()).availableSeats, 18);
  await db.orm.public.Booking.where({ id: secondHold.id }).update({
    expiresAt: past,
  });
  const race = await Promise.all([reserve(first.token), reserve(third.token)]);
  assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
  const winner = (await race.find((r) => r.status === 201)!.json()).data;
  assert.equal(
    (
      await db.orm.public.BookingSeat.where({
        tripId: trip.id,
        seatId: seats[0]!.id,
        releasedAt: null,
      }).all()
    ).length,
    1,
  );
  await db.orm.public.Booking.where({ id: winner.id }).update({
    expiresAt: past,
  });
  const [cleanup, fresh] = await Promise.all([
    expireBookingHolds(),
    reserve(second.token),
  ]);
  assert.ok(cleanup.processedTrips >= 0);
  assert.equal(fresh.status, 201);
  await expireBookingHolds();
  await expireBookingHolds();
  assert.equal((await availability()).availableSeats, 18);
  assert.equal(
    (await db.orm.public.BookingSeat.where({ bookingId: hold.id }).all())
      .length,
    2,
  );
  for (const path of [
    '/bookings/' + hold.id,
    '/bookings/' + hold.id + '/cancel',
  ])
    assert.equal(
      (
        await request(
          path,
          first.token,
          path.endsWith('/cancel') ? 'POST' : 'DELETE',
        )
      ).status,
      404,
    );
  // A hold must not outlive the bus departure.
  const nearBus = data.buses[1]!,
    nearId = randomUUID();
  tripIds.push(nearId);
  const nearDeparture = new Date(Date.now() + 300000).toISOString();
  await db.orm.public.Trip.create({
    id: nearId,
    routeId: trip.routeId,
    busId: nearBus.id,
    departureAt: nearDeparture,
    arrivalAt: new Date(Date.parse(nearDeparture) + 3600000).toISOString(),
    pricePiastres: 100,
  });
  const nearSeat = data.seats.find((s) => s.busId === nearBus.id)!;
  const near = await reserve(third.token, payload([nearSeat.id], nearId));
  assert.equal(near.status, 201);
  assert.equal((await near.json()).data.expiresAt, nearDeparture);
});
