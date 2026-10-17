import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash, argon2id } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { busService } from '../../src/services/busService.ts';
import { tripService } from '../../src/services/tripService.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import type { UserRole } from '../../src/schemas/authSchema.ts';

test('administrator booking reads filter real reservations, preserve passenger ownership and enforce live roles without exposing credentials', async (t) => {
  const namespace = 'admin-bookings-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace);
  const users: string[] = [],
    extraTrips: string[] = [],
    extraBuses: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      const tripIds = [...extraTrips, ...data.trips.map((trip) => trip.id)];
      for (const tripId of tripIds)
        await db.orm.public.Booking.where({ tripId }).deleteAll();
      for (const id of users) await db.orm.public.User.where({ id }).delete();
      for (const id of tripIds) await db.orm.public.Trip.where({ id }).delete();
      for (const route of data.routes)
        await db.orm.public.Route.where({ id: route.id }).delete();
      for (const id of [...extraBuses, ...data.buses.map((bus) => bus.id)])
        await db.orm.public.Bus.where({ id }).delete();
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
  await seedDemo('2099-01-01', namespace);
  const password = 'Admin-booking-test-password-2026',
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  async function account(label: string, role: UserRole = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Booking account ' + label,
      email: namespace + '-' + label + '@example.test',
      phone: '+201012345678',
      passwordHash,
      emailVerifiedAt: new Date().toISOString(),
      role,
    });
    users.push(user.id);
    const response = await fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ email: user.email, password }),
    });
    assert.equal(response.status, 200);
    const token = (await response.json()).data.accessToken as string;
    return {
      user,
      token,
      auth: await sessionService.authenticateAccessToken(token),
    };
  }
  const a = await account('a'),
    b = await account('b'),
    admin = await account('admin', 'ADMIN'),
    superAdmin = await account('super', 'SUPER_ADMIN');
  const headers = (token: string) => ({ Authorization: 'Bearer ' + token });
  async function read(path: string, token = admin.token) {
    const response = await fetch(base + path, { headers: headers(token) });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()).data;
  }
  const trip = data.trips[0]!,
    later = data.trips[3]!;
  const seats = data.seats
    .filter((seat) => seat.busId === trip.busId)
    .sort((x, y) => x.number - y.number);
  const first = await bookingService.create(a.auth, {
    tripId: trip.id,
    contactPhone: '+201099999999',
    passengers: [
      { seatId: seats[1]!.id, name: 'Second passenger' },
      { seatId: seats[0]!.id, name: 'First passenger' },
    ],
  });
  const second = await bookingService.create(b.auth, {
    tripId: trip.id,
    contactPhone: '+201088888888',
    passengers: [{ seatId: seats[2]!.id, name: 'Other account passenger' }],
  });
  const historical = await bookingService.create(a.auth, {
    tripId: later.id,
    contactPhone: '+201099999999',
    passengers: [{ seatId: seats[0]!.id, name: 'Later passenger' }],
  });
  const endpoint = '/admin/bookings';
  for (const travelDate of ['0000-01-01', '1999-12-31', '9999-12-31'])
    assert.equal(
      (
        await fetch(base + endpoint + '?travelDate=' + travelDate, {
          headers: headers(admin.token),
        })
      ).status,
      400,
    );
  for (const path of [endpoint, endpoint + '/' + first.id]) {
    assert.equal((await fetch(base + path)).status, 401);
    assert.equal(
      (await fetch(base + path, { headers: headers(a.token) })).status,
      403,
    );
  }
  const details = await read(endpoint + '/' + first.id);
  assert.deepEqual(details.customer, {
    id: a.user.id,
    name: a.user.name,
    email: a.user.email,
    phone: a.user.phone,
  });
  assert.equal(details.contactPhone, '+201099999999');
  assert.equal(details.trip.status, 'SCHEDULED');
  assert.equal(details.paymentRequired, true);
  assert.equal(details.status, 'PENDING_PAYMENT');
  assert.equal(details.expiresAt, first.expiresAt);
  assert.equal(details.currency, 'EGP');
  assert.equal(details.totalPiastres, 2 * trip.pricePiastres);
  assert.deepEqual(
    details.passengers.map((p: { seatNumber: number }) => p.seatNumber),
    [1, 2],
  );
  assert.equal(details.passengers[0].name, 'First passenger');
  assert.deepEqual(Object.keys(details.customer).sort(), [
    'email',
    'id',
    'name',
    'phone',
  ]);
  for (const privateField of [
    'passwordHash',
    'lockedUntil',
    'loginFailures',
    'sessions',
    'refreshTokenHash',
    'codeHash',
    'role',
  ])
    assert.equal(
      JSON.stringify(details).includes(privateField),
      false,
      privateField,
    );
  assert.equal(
    (await read(endpoint + '/' + second.id, superAdmin.token)).customer.id,
    b.user.id,
  );
  // A management role never widens the existing passenger endpoint's ownership scope.
  assert.equal(
    (
      await fetch(base + '/bookings/' + first.id, {
        headers: headers(admin.token),
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(base + '/bookings/' + second.id, {
        headers: headers(a.token),
      })
    ).status,
    404,
  );
  assert.deepEqual(await read('/bookings', admin.token), []);
  const owned = await read('/bookings/' + first.id, a.token);
  assert.equal('customer' in owned, false);
  assert.equal('status' in owned.trip, false);
  assert.equal(JSON.stringify(owned).includes(b.user.email), false);
  for (const method of ['PATCH', 'DELETE'])
    assert.equal(
      (
        await fetch(base + endpoint + '/' + first.id, {
          method,
          headers: headers(admin.token),
        })
      ).status,
      404,
    );
  assert.equal(
    (
      await fetch(base + endpoint + '/' + randomUUID(), {
        headers: headers(admin.token),
      })
    ).status,
    404,
  );
  // Deterministic ordering when multiple bookings have the same createdAt timestamp.
  for (const id of [first.id, second.id, historical.id])
    await db.orm.public.Booking.where({ id }).update({
      createdAt: '2026-01-01T00:00:00Z',
    });
  const byUser = await read(endpoint + '?userId=' + a.user.id);
  assert.deepEqual(
    byUser.map((row: { id: string }) => row.id),
    [first.id, historical.id].sort().reverse(),
  );
  assert.ok(byUser.every((row: object) => !('passengers' in row)));
  assert.equal(JSON.stringify(byUser).includes('First passenger'), false);
  const paged = await fetch(
    base + endpoint + '?userId=' + a.user.id + '&limit=1&offset=1',
    { headers: headers(admin.token) },
  );
  const pagedBody = await paged.json();
  assert.equal(paged.status, 200);
  assert.deepEqual(pagedBody.pagination, { limit: 1, offset: 1 });
  assert.deepEqual(pagedBody.data, [byUser[1]]);
  const byTrip = await read(endpoint + '?tripId=' + trip.id);
  assert.deepEqual(
    byTrip.map((row: { id: string }) => row.id).sort(),
    [first.id, second.id].sort(),
  );
  const reference = new URLSearchParams({
    reference: ' ' + first.reference.toLowerCase() + ' ',
  });
  assert.deepEqual(
    (await read(endpoint + '?' + reference)).map(
      (row: { id: string }) => row.id,
    ),
    [first.id],
  );
  const email = new URLSearchParams({
    email: ' ' + a.user.email.toUpperCase() + ' ',
    tripId: trip.id,
    userId: a.user.id,
    travelDate: '2099-01-01',
  });
  assert.deepEqual(
    (await read(endpoint + '?' + email)).map((row: { id: string }) => row.id),
    [first.id],
  );
  assert.deepEqual(
    await read(endpoint + '?' + email + '&reference=' + second.reference),
    [],
  );
  assert.deepEqual(await read(endpoint + '?userId=' + randomUUID()), []);
  assert.deepEqual(
    await read(endpoint + '?reference=BUS-0000000000000000'),
    [],
  );
  assert.deepEqual(await read(endpoint + '?email=nobody@example.test'), []);
  // Travel dates use Cairo departure days with inclusive start and exclusive end, not UTC dates.
  const boundaryBus = await busService.create({
    plateNumber: 'BOUNDARY-' + randomUUID().slice(0, 12),
    seatCount: 1,
    isActive: true,
  });
  extraBuses.push(boundaryBus.id);
  const boundarySeat = (await busService.listSeats(boundaryBus.id))![0]!;
  const boundaryBookings: string[] = [];
  for (const departureAt of [
    '2098-12-31T21:59:59.999Z',
    '2099-01-01T21:59:59.999Z',
    '2099-01-01T22:00:00.000Z',
  ]) {
    const departure = await tripService.create({
      routeId: trip.routeId,
      busId: boundaryBus.id,
      departureAt,
      arrivalAt: new Date(Date.parse(departureAt) + 1).toISOString(),
      pricePiastres: 100,
      status: 'SCHEDULED',
    });
    extraTrips.push(departure.id);
    boundaryBookings.push(
      (
        await bookingService.create(b.auth, {
          tripId: departure.id,
          contactPhone: '+201088888888',
          passengers: [{ seatId: boundarySeat.id, name: 'Boundary passenger' }],
        })
      ).id,
    );
  }
  const day = await read(
    endpoint + '?userId=' + b.user.id + '&travelDate=2099-01-01',
  );
  assert.deepEqual(
    day.map((row: { id: string }) => row.id).sort(),
    [second.id, boundaryBookings[1]!].sort(),
  );
  // Operational reads also retain past, cancelled and inactive catalog records.
  await db.orm.public.Trip.where({ id: later.id }).update({
    status: 'CANCELLED',
    departureAt: '2020-01-01T00:00:00Z',
    arrivalAt: '2020-01-01T03:00:00Z',
  });
  await db.orm.public.Bus.where({ id: later.busId }).update({
    isActive: false,
  });
  await db.orm.public.Route.where({ id: later.routeId }).update({
    isActive: false,
  });
  const past = await read(endpoint + '/' + historical.id);
  assert.equal(past.trip.status, 'CANCELLED');
  assert.deepEqual(
    (
      await read(endpoint + '?userId=' + a.user.id + '&travelDate=2020-01-01')
    ).map((row: { id: string }) => row.id),
    [historical.id],
  );
  // Existing tokens immediately lose administrative access after a database role change.
  await db.orm.public.User.where({ id: admin.user.id }).update({
    role: 'USER',
  });
  assert.equal(
    (await fetch(base + endpoint, { headers: headers(admin.token) })).status,
    403,
  );
  await db.orm.public.User.where({ id: admin.user.id }).update({
    role: 'ADMIN',
    isActive: false,
  });
  assert.equal(
    (await fetch(base + endpoint, { headers: headers(admin.token) })).status,
    401,
  );
  assert.equal(
    (await read(endpoint + '/' + first.id, superAdmin.token)).id,
    first.id,
  );
  // These reads do not modify reservation allocations or totals.
  const saved = await db.orm.public.Booking.where({ id: first.id }).first();
  assert.equal(saved!.totalPiastres, BigInt(first.totalPiastres));
  assert.equal(
    (await db.orm.public.BookingSeat.where({ bookingId: first.id }).all())
      .length,
    2,
  );
});
