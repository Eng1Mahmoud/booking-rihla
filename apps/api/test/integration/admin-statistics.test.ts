import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { createApp } from '../../src/app.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { adminStatisticsService } from '../../src/services/adminStatisticsService.ts';
import { cairoDayBounds } from '../../src/utils/cairoTime.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';

test('administrator statistics count a Cairo travel day without mutating history', async (t) => {
  const namespace = 'statistics-' + randomUUID(),
    data = buildDemoData('2025-10-29', namespace),
    users: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const trip of data.trips) {
        await db.orm.public.Booking.where({ tripId: trip.id }).deleteAll();
        await db.orm.public.Trip.where({ id: trip.id }).delete();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/admin/statistics';
  await seedDemo('2025-10-29', namespace);
  const { start, end } = cairoDayBounds('2025-10-30');
  assert.equal(Date.parse(end) - Date.parse(start), 25 * 3600000);
  for (const [index, time] of [
    [0, Date.parse(start) - 1],
    [3, Date.parse(start)],
    [4, Date.parse(end) - 1],
    [6, Date.parse(end)],
  ] as const)
    await db.orm.public.Trip.where({ id: data.trips[index]!.id }).update({
      departureAt: new Date(time).toISOString(),
      arrivalAt: new Date(time + 3600000).toISOString(),
    });
  const target = data.trips[3]!,
    cancelled = data.trips[5]!;
  await db.orm.public.Trip.where({ id: cancelled.id }).update({
    status: 'CANCELLED',
  });
  async function account(role: 'USER' | 'ADMIN' | 'SUPER_ADMIN') {
    const user = await db.orm.public.User.create({
      name: 'Private user',
      email: randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash: 'private-hash',
      role,
      emailVerifiedAt: new Date().toISOString(),
    });
    users.push(user.id);
    const session = await db.orm.public.Session.create({
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    return { user, session, token: await signAccessToken(user.id, session.id) };
  }
  const owner = await account('USER'),
    admin = await account('ADMIN'),
    superAdmin = await account('SUPER_ADMIN');
  let offset = 0;
  async function booking(
    status:
      | 'RESERVED'
      | 'PENDING_PAYMENT'
      | 'PAYMENT_PROCESSING'
      | 'CONFIRMED'
      | 'EXPIRED',
    count: number,
    expired = false,
    released = false,
    trip = target,
  ) {
    const b = await db.orm.public.Booking.create({
      reference:
        'BUS-' + randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase(),
      userId: owner.user.id,
      tripId: trip.id,
      status,
      expiresAt:
        status === 'RESERVED'
          ? null
          : new Date(Date.now() + (expired ? -3600000 : 3600000)).toISOString(),
      contactPhone: '+201012345678',
      seatCount: count,
      unitPricePiastres: 25000,
      totalPiastres: BigInt(count * 25000),
      createdAt: '2024-01-01T00:00:00Z',
    });
    const seats = data.seats
      .filter((s) => s.busId === trip.busId)
      .slice(offset, offset + count);
    offset += count;
    assert.equal(seats.length, count);
    for (const seat of seats)
      await db.orm.public.BookingSeat.create({
        bookingId: b.id,
        tripId: trip.id,
        seatId: seat.id,
        seatNumber: seat.number,
        passengerName: 'Private passenger',
        releasedAt: released ? new Date().toISOString() : null,
      });
    return b;
  }
  await booking('RESERVED', 2);
  await booking('PENDING_PAYMENT', 3);
  const expired = await booking('PENDING_PAYMENT', 1, true);
  await booking('PAYMENT_PROCESSING', 1, true);
  await booking('CONFIRMED', 2, true);
  await booking('EXPIRED', 1, true);
  await booking('RESERVED', 1, false, true);
  offset = 0;
  await booking('CONFIRMED', 1, true, false, cancelled);
  await t.test(
    'status buckets and physical seats handle holds, releases, cancellation and DST bounds',
    async () => {
      const result = await adminStatisticsService.get({
        travelDate: '2025-10-30',
      });
      assert.equal(result.start, start);
      assert.equal(result.end, end);
      assert.equal(result.timeZone, 'Africa/Cairo');
      assert.deepEqual(result.trips, {
        total: 3,
        scheduled: 2,
        cancelled: 1,
        upcoming: 0,
        departed: 2,
      });
      assert.deepEqual(result.bookings, {
        total: 8,
        reserved: 2,
        pendingPayment: 1,
        paymentProcessing: 1,
        confirmed: 2,
        expired: 2,
      });
      assert.deepEqual(result.seats, {
        total: 40,
        reserved: 2,
        held: 3,
        paymentProcessing: 1,
        confirmed: 2,
        occupied: 8,
        available: 32,
        occupancyPercent: 20,
      });
      assert.equal(
        (await db.orm.public.Booking.where({ id: expired.id }).first())?.status,
        'PENDING_PAYMENT',
      );
      for (const value of ['Private', 'password', owner.user.email, 'Piastres'])
        assert.ok(!JSON.stringify(result).includes(value));
    },
  );
  await t.test(
    'empty day has zero occupancy; future and inactive-bus trips remain operational counts',
    async () => {
      const empty = await adminStatisticsService.get({
        travelDate: '2097-02-01',
      });
      assert.equal(empty.trips.total, 0);
      assert.equal(empty.bookings.total, 0);
      assert.equal(empty.seats.total, 0);
      assert.equal(empty.seats.occupancyPercent, 0);
      const trip = data.trips[8]!;
      await db.orm.public.Trip.where({ id: trip.id }).update({
        departureAt: '2097-02-01T09:00:00Z',
        arrivalAt: '2097-02-01T10:00:00Z',
      });
      await db.orm.public.Bus.where({ id: trip.busId }).update({
        isActive: false,
      });
      const future = await adminStatisticsService.get({
        travelDate: '2097-02-01',
      });
      assert.deepEqual(future.trips, {
        total: 1,
        scheduled: 1,
        cancelled: 0,
        upcoming: 1,
        departed: 0,
      });
      assert.equal(future.seats.total, 20);
    },
  );
  await t.test(
    'real sessions enforce current roles and revocation and reads preserve all booking rows',
    async () => {
      const snapshot = async () => ({
        bookings: await db.orm.public.Booking.orderBy((b) => b.id.asc()).all(),
        seats: await db.orm.public.BookingSeat.orderBy((s) => s.id.asc()).all(),
      });
      const before = await snapshot();
      assert.equal((await fetch(base)).status, 401);
      const get = (token: string) =>
        fetch(base + '?travelDate=2025-10-30', {
          headers: { Authorization: 'Bearer ' + token },
        });
      assert.equal((await get(owner.token)).status, 403);
      for (const who of [admin, superAdmin]) {
        const response = await get(who.token);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal((await response.json()).data.seats.occupied, 8);
      }
      await db.orm.public.User.where({ id: admin.user.id }).update({
        role: 'USER',
      });
      assert.equal((await get(admin.token)).status, 403);
      await db.orm.public.Session.where({ id: superAdmin.session.id }).update({
        revokedAt: new Date().toISOString(),
      });
      assert.equal((await get(superAdmin.token)).status, 401);
      assert.deepEqual(await snapshot(), before);
    },
  );
});
