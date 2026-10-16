import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash, argon2id } from 'argon2';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { sessionService } from '../../src/services/sessionService.ts';
import { tripService } from '../../src/services/tripService.ts';
import { busService } from '../../src/services/busService.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import {
  isUniqueViolation,
  isForeignKeyViolation,
  isCheckViolation,
} from '../../src/utils/databaseErrors.ts';
import { AppError } from '../../src/errors/AppError.ts';
import type { UserRole } from '../../src/schemas/authSchema.ts';

test('reservations enforce ownership, atomic seat uniqueness, price snapshots, trip guards and no passenger cancellation in PostgreSQL', async (t) => {
  const namespace = 'booking-test-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      for (const trip of data.trips)
        await db.orm.public.Booking.where({ tripId: trip.id }).deleteAll();
      for (const id of users) await db.orm.public.User.where({ id }).delete();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  const configuredBus = data.buses[0]!;
  await db.orm.public.Bus.create({
    ...configuredBus,
    seatLayout: 'STANDARD_2_2',
  });
  await seedDemo('2099-01-01', namespace);
  const trip = data.trips[0]!,
    later = data.trips[3]!,
    other = data.trips[1]!;
  const seats = data.seats
      .filter((seat) => seat.busId === trip.busId)
      .sort((a, b) => a.number - b.number),
    otherSeats = data.seats.filter((seat) => seat.busId === other.busId);
  assert.equal(later.busId, trip.busId);
  assert.ok(seats.length >= 12 && otherSeats.length);
  const password = 'Booking-test-password-2026',
    passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  async function account(label: string, role: UserRole = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Booking ' + label,
      email: 'booking-' + label + '-' + randomUUID() + '@example.test',
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
  const first = await account('first'),
    second = await account('second'),
    admin = await account('admin', 'ADMIN');
  const headers = (token: string) => ({
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token,
  });
  const input = (tripId = trip.id, selected = [seats[0]!.id]) => ({
    tripId,
    contactPhone: '+201012345678',
    passengers: selected.map((seatId, index) => ({
      seatId,
      name: 'Passenger ' + (index + 1),
    })),
  });
  const reserve = (token: string, body = input()) =>
    fetch(base + '/bookings', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(body),
    });
  async function error(response: Response, status: number, code: string) {
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
  async function rejected(promise: Promise<unknown>, code: string) {
    await assert.rejects(
      promise,
      (error) => error instanceof AppError && error.code === code,
    );
  }
  const readSeats = async (id = trip.id) => {
    const response = await fetch(base + '/trips/' + id + '/seats');
    assert.equal(response.status, 200);
    return (await response.json()).data;
  };
  const displayed = await readSeats();
  assert.equal(displayed.availableSeats, 20);
  assert.equal(displayed.seatLayout, 'STANDARD_2_2');
  assert.equal('layout' in displayed, false);
  assert.equal('cells' in displayed, false);
  const created = await reserve(
    first.token,
    input(trip.id, [seats[1]!.id, seats[0]!.id]),
  );
  assert.equal(created.status, 201);
  const booking = (await created.json()).data;
  assert.equal(
    created.headers.get('location'),
    '/api/v1/bookings/' + booking.id,
  );
  assert.equal(created.headers.get('cache-control'), 'no-store');
  assert.match(booking.reference, /^BUS-[A-F0-9]{16}$/);
  assert.equal(booking.status, 'RESERVED');
  assert.equal(booking.paymentRequired, false);
  assert.equal(booking.currency, 'EGP');
  assert.equal(booking.unitPricePiastres, trip.pricePiastres);
  assert.equal(booking.totalPiastres, 2 * trip.pricePiastres);
  assert.deepEqual(
    booking.passengers.map((p: { seatNumber: number }) => p.seatNumber),
    [1, 2],
  );
  assert.equal(booking.trip.route.originStation.city.nameEn, 'Cairo');
  assert.ok(!JSON.stringify(booking).includes('passwordHash'));
  assert.ok(!JSON.stringify(booking).includes('plateNumber'));
  const stored = await db.orm.public.Booking.where({ id: booking.id }).first();
  assert.equal(stored?.userId, first.user.id);
  assert.equal(stored?.totalPiastres, BigInt(2 * trip.pricePiastres));
  const available = await readSeats();
  assert.equal(available.availableSeats, 18);
  assert.equal(
    available.seats.find((s: { id: string }) => s.id === seats[0]!.id)
      .isAvailable,
    false,
  );
  assert.ok(!JSON.stringify(available).includes('Passenger'));
  assert.equal((await readSeats(later.id)).availableSeats, 20);
  const own = await fetch(base + '/bookings/' + booking.id, {
    headers: headers(first.token),
  });
  assert.equal(own.status, 200);
  assert.deepEqual((await own.json()).data, booking);
  for (const actor of [second, admin]) {
    const denied = await fetch(base + '/bookings/' + booking.id, {
      headers: headers(actor.token),
    });
    await error(denied, 404, 'BOOKING_NOT_FOUND');
    const list = await fetch(base + '/bookings', {
      headers: headers(actor.token),
    });
    assert.deepEqual((await list.json()).data, []);
  }
  const missing = await fetch(base + '/bookings/' + randomUUID(), {
    headers: headers(second.token),
  });
  await error(missing, 404, 'BOOKING_NOT_FOUND');
  // A two-seat request containing one occupied seat must not reserve the other seat.
  await error(
    await reserve(second.token, input(trip.id, [seats[0]!.id, seats[2]!.id])),
    409,
    'SEAT_UNAVAILABLE',
  );
  assert.equal(
    await db.orm.public.BookingSeat.where({
      tripId: trip.id,
      seatId: seats[2]!.id,
    }).first(),
    null,
  );
  assert.equal(
    (await db.orm.public.Booking.where({ userId: second.user.id }).all())
      .length,
    0,
  );
  const race = await Promise.all([
    reserve(first.token, input(trip.id, [seats[2]!.id])),
    reserve(second.token, input(trip.id, [seats[2]!.id])),
  ]);
  assert.deepEqual(race.map((r) => r.status).sort(), [201, 409]);
  const loser = race.find((r) => r.status === 409)!;
  assert.equal((await loser.json()).error.code, 'SEAT_UNAVAILABLE');
  assert.equal(
    (
      await db.orm.public.BookingSeat.where({
        tripId: trip.id,
        seatId: seats[2]!.id,
      }).all()
    ).length,
    1,
  );
  await error(
    await reserve(first.token, input(trip.id, [otherSeats[0]!.id])),
    400,
    'INVALID_SEATS',
  );
  // The database itself rejects duplicate allocations even when HTTP/service checks are bypassed.
  await assert.rejects(
    db.orm.public.BookingSeat.create({
      bookingId: booking.id,
      tripId: trip.id,
      seatId: seats[0]!.id,
      seatNumber: 1,
      passengerName: 'Duplicate',
    }),
    (error) => isUniqueViolation(error, 'BookingSeat_tripId_seatId_key'),
  );
  await assert.rejects(
    db.orm.public.BookingSeat.create({
      bookingId: booking.id,
      tripId: later.id,
      seatId: seats[3]!.id,
      seatNumber: 4,
      passengerName: 'Wrong trip',
    }),
    isForeignKeyViolation,
  );
  await assert.rejects(
    db.orm.public.Booking.where({ id: booking.id }).update({
      totalPiastres: 1n,
    }),
    (error) => isCheckViolation(error, 'booking_price_total_9fa87c89'),
  );
  await assert.rejects(
    db.orm.public.Booking.where({ id: booking.id }).update({
      seatCount: 0,
      totalPiastres: 0n,
    }),
    (error) => isCheckViolation(error, 'booking_seat_count_2c34aaa7'),
  );
  // A seat can be reserved independently on a later departure of the same bus.
  const laterBooking = await reserve(
    second.token,
    input(later.id, [seats[0]!.id]),
  );
  assert.equal(laterBooking.status, 201);
  assert.equal((await readSeats(later.id)).availableSeats, 19);
  for (const change of [
    { busId: other.busId },
    { routeId: other.routeId },
    { pricePiastres: 1 },
    { departureAt: '2099-01-10T08:00:00Z' },
    { arrivalAt: '2099-01-01T20:00:00Z' },
    { status: 'CANCELLED' as const },
  ])
    await rejected(tripService.update(trip.id, change), 'TRIP_HAS_BOOKINGS');
  assert.ok(
    await tripService.update(trip.id, { pricePiastres: trip.pricePiastres }),
  );
  await rejected(tripService.remove(trip.id), 'TRIP_IN_USE');
  await rejected(
    busService.update(trip.busId, { seatCount: 10 }),
    'BUS_HAS_TRIPS',
  );
  await rejected(busService.remove(trip.busId), 'BUS_IN_USE');
  // Unsupported passenger operations cannot mutate or release the reservation.
  for (const [method, path] of [
    ['DELETE', '/bookings/' + booking.id],
    ['PATCH', '/bookings/' + booking.id],
    ['POST', '/bookings/' + booking.id + '/cancel'],
  ])
    assert.equal(
      (
        await fetch(base + path, {
          method,
          headers: headers(first.token),
          body: '{}',
        })
      ).status,
      404,
    );
  assert.equal(
    (await db.orm.public.Booking.where({ id: booking.id }).first())?.status,
    'RESERVED',
  );
  assert.equal((await readSeats()).availableSeats, 17);
  const page = await fetch(base + '/bookings?limit=1&offset=0', {
    headers: headers(first.token),
  });
  const pageBody = await page.json();
  assert.equal(pageBody.data.length, 1);
  assert.deepEqual(pageBody.pagination, { limit: 1, offset: 0 });
  assert.ok(pageBody.data.every((row: { id: string }) => row.id !== undefined));
  // Authentication is rechecked in the transaction, including direct service callers.
  await db.orm.public.User.where({ id: second.user.id }).update({
    isActive: false,
  });
  await rejected(
    bookingService.create(second.auth, input(trip.id, [seats[4]!.id])),
    'UNAUTHENTICATED',
  );
  await db.orm.public.User.where({ id: second.user.id }).update({
    isActive: true,
  });
  await db.orm.public.Session.where({ id: second.auth.sessionId }).update({
    revokedAt: new Date().toISOString(),
  });
  await rejected(
    bookingService.create(second.auth, input(trip.id, [seats[4]!.id])),
    'UNAUTHENTICATED',
  );
  // Use a separate unbooked trip for eligibility checks and totals beyond int32.
  const otherInput = input(other.id, [otherSeats[0]!.id, otherSeats[1]!.id]);
  await db.orm.public.Trip.where({ id: other.id }).update({
    status: 'CANCELLED',
  });
  await rejected(
    bookingService.create(first.auth, otherInput),
    'TRIP_UNAVAILABLE',
  );
  await db.orm.public.Trip.where({ id: other.id }).update({
    status: 'SCHEDULED',
  });
  await db.orm.public.Bus.where({ id: other.busId }).update({
    isActive: false,
  });
  await rejected(
    bookingService.create(first.auth, otherInput),
    'TRIP_UNAVAILABLE',
  );
  await db.orm.public.Bus.where({ id: other.busId }).update({ isActive: true });
  await db.orm.public.Route.where({ id: other.routeId }).update({
    isActive: false,
  });
  await rejected(
    bookingService.create(first.auth, otherInput),
    'TRIP_UNAVAILABLE',
  );
  await db.orm.public.Route.where({ id: other.routeId }).update({
    isActive: true,
  });
  await db.orm.public.Trip.where({ id: other.id }).update({
    departureAt: '2000-01-01T08:00:00Z',
    arrivalAt: '2000-01-01T11:00:00Z',
  });
  await rejected(
    bookingService.create(first.auth, otherInput),
    'TRIP_UNAVAILABLE',
  );
  await db.orm.public.Trip.where({ id: other.id }).update({
    departureAt: other.departureAt,
    arrivalAt: other.arrivalAt,
  });
  await rejected(
    bookingService.create(first.auth, input(randomUUID())),
    'TRIP_NOT_FOUND',
  );
  await tripService.update(other.id, { pricePiastres: 2147483647 });
  const large = await bookingService.create(first.auth, otherInput);
  assert.equal(large.totalPiastres, 4294967294);
  assert.equal(Number.isSafeInteger(large.totalPiastres), true);
  // A failure while inserting passengers must roll back the parent reservation too.
  const beforeRollback = (
    await db.orm.public.Booking.where({ userId: first.user.id }).all()
  ).length;
  await assert.rejects(
    bookingService.create(first.auth, {
      ...input(trip.id, [seats[9]!.id]),
      passengers: [{ seatId: seats[9]!.id, name: null as unknown as string }],
    }),
  );
  assert.equal(
    (await db.orm.public.Booking.where({ userId: first.user.id }).all()).length,
    beforeRollback,
  );
  assert.equal(
    await db.orm.public.BookingSeat.where({
      tripId: trip.id,
      seatId: seats[9]!.id,
    }).first(),
    null,
  );
  // Trip edit and reservation share a lock: either the edit wins before pricing, or it is refused.
  const concurrentTrip = data.trips[2]!,
    concurrentSeats = data.seats.filter(
      (s) => s.busId === concurrentTrip.busId,
    );
  const concurrent = await Promise.allSettled([
    bookingService.create(
      first.auth,
      input(concurrentTrip.id, [concurrentSeats[0]!.id]),
    ),
    tripService.update(concurrentTrip.id, { pricePiastres: 77777 }),
  ]);
  assert.equal(concurrent[0]!.status, 'fulfilled');
  if (concurrent[0]!.status === 'fulfilled') {
    const saved = await db.orm.public.Trip.where({
      id: concurrentTrip.id,
    }).first();
    assert.equal(concurrent[0]!.value.unitPricePiastres, saved?.pricePiastres);
  }
  if (concurrent[1]!.status === 'rejected')
    assert.ok(
      concurrent[1]!.reason instanceof AppError &&
        concurrent[1]!.reason.code === 'TRIP_HAS_BOOKINGS',
    );
  await db.orm.public.Trip.where({ id: trip.id }).update({
    departureAt: '2000-01-01T08:00:00Z',
    arrivalAt: '2000-01-01T11:00:00Z',
  });
  assert.equal(
    (await fetch(base + '/trips/' + trip.id + '/seats')).status,
    404,
  );
  const history = await fetch(base + '/bookings/' + booking.id, {
    headers: headers(first.token),
  });
  assert.equal(history.status, 200);
  assert.equal((await history.json()).data.id, booking.id);
});
