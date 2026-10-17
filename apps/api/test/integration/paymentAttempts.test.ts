import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';
import { paymentAttemptService } from '../../src/services/paymentAttemptService.ts';
import { expireBookingHolds } from '../../src/services/bookingHoldService.ts';
import {
  isUniqueViolation,
  isCheckViolation,
  isForeignKeyViolation,
  isRestrictViolation,
} from '../../src/utils/databaseErrors.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';

test('payment preparation is owner-scoped, idempotent, server-priced and serialized with seat expiry', async (t) => {
  const namespace = 'payment-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [];
  const server = createApp([]).listen(0, '127.0.0.1');
  t.after(async () => {
    try {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      for (const trip of data.trips) {
        for (const booking of await db.orm.public.Booking.where({
          tripId: trip.id,
        }).all())
          await db.orm.public.PaymentAttempt.where({
            bookingId: booking.id,
          }).deleteAll();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1';
  await seedDemo('2099-01-01', namespace);
  async function account(role: 'USER' | 'ADMIN' = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Payment test',
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
    const auth: AuthContext = { user, sessionId: session.id };
    return {
      user,
      session,
      auth,
      token: await signAccessToken(user.id, session.id),
    };
  }
  const first = await account(),
    second = await account(),
    admin = await account('ADMIN'),
    trip = data.trips[0]!;
  const seats = data.seats
    .filter((s) => s.busId === trip.busId)
    .sort((a, b) => a.number - b.number);
  async function reserve(
    owner = first,
    seatIds = [seats[0]!.id],
    target = trip,
  ) {
    const response = await fetch(base + '/bookings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + owner.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tripId: target.id,
        contactPhone: '+201012345678',
        passengers: seatIds.map((seatId) => ({ seatId, name: 'Passenger' })),
      }),
    });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  }
  function prepare(bookingId: string, key: string, token = first.token) {
    return fetch(base + '/bookings/' + bookingId + '/payment-attempt', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: '{}',
    });
  }
  function read(bookingId: string, token = first.token) {
    return fetch(base + '/bookings/' + bookingId + '/payment-attempt', {
      headers: { Authorization: 'Bearer ' + token },
    });
  }
  const hold = await reserve(first, [seats[0]!.id, seats[1]!.id]);
  const seatsBefore = await db.orm.public.BookingSeat.where({
    bookingId: hold.id,
  }).all();
  assert.equal((await read(hold.id)).status, 404);
  const key = randomUUID();
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => prepare(hold.id, key)),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(responses.filter((r) => r.status === 200).length, 7);
  const payloads = await Promise.all(responses.map((r) => r.json())),
    attempt = payloads[0]!.data;
  for (const payload of payloads) assert.deepEqual(payload.data, attempt);
  assert.equal(attempt.status, 'PREPARED');
  assert.equal(attempt.amountPiastres, hold.totalPiastres);
  assert.equal(attempt.amountPiastres, 50000);
  assert.equal(attempt.currency, 'EGP');
  assert.equal(attempt.expiresAt, hold.expiresAt);
  assert.equal(attempt.bookingId, hold.id);
  assert.deepEqual((await (await read(hold.id)).json()).data, attempt);
  for (const field of [
    'idempotencyKey',
    'checkoutUrl',
    'contactPhone',
    'userId',
    'passwordHash',
    'email',
  ])
    assert.ok(!(field in attempt));
  const stored = (await db.orm.public.PaymentAttempt.where({
    bookingId: hold.id,
  }).first())!;
  assert.equal(stored.idempotencyKey, key);
  assert.equal(
    (await db.orm.public.PaymentAttempt.where({ bookingId: hold.id }).all())
      .length,
    1,
  );
  assert.deepEqual(
    await db.orm.public.BookingSeat.where({ bookingId: hold.id }).all(),
    seatsBefore,
  );
  assert.equal(
    (await db.orm.public.Booking.where({ id: hold.id }).first())!.status,
    'PENDING_PAYMENT',
  );
  const conflict = await prepare(hold.id, randomUUID());
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).error.code, 'PAYMENT_ATTEMPT_EXISTS');
  for (const owner of [second, admin]) {
    assert.equal((await read(hold.id, owner.token)).status, 404);
    assert.equal((await prepare(hold.id, key, owner.token)).status, 404);
  }
  assert.equal((await prepare(randomUUID(), key)).status, 404);
  const another = await reserve(first, [seats[2]!.id]);
  // Keys are scoped to a booking, never to a different passenger or booking.
  assert.equal((await prepare(another.id, key)).status, 201);
  await assert.rejects(
    db.orm.public.PaymentAttempt.create({
      bookingId: hold.id,
      idempotencyKey: randomUUID(),
      amountPiastres: 50000n,
      expiresAt: hold.expiresAt,
    }),
    (e) => isUniqueViolation(e, 'PaymentAttempt_bookingId_key'),
  );
  await assert.rejects(
    db.orm.public.Booking.where({ id: hold.id }).delete(),
    (e) => isForeignKeyViolation(e) || isRestrictViolation(e),
  );
  await db.orm.public.Booking.where({ id: hold.id }).update({
    unitPricePiastres: 26000,
    totalPiastres: 52000n,
  });
  const mismatch = await prepare(hold.id, key);
  assert.equal(mismatch.status, 409);
  assert.equal((await mismatch.json()).error.code, 'PAYMENT_ATTEMPT_MISMATCH');
  await db.orm.public.Booking.where({ id: hold.id }).update({
    unitPricePiastres: 25000,
    totalPiastres: 50000n,
  });
  for (const change of ['trip', 'route', 'bus']) {
    if (change === 'trip')
      await db.orm.public.Trip.where({ id: trip.id }).update({
        status: 'CANCELLED',
      });
    if (change === 'route')
      await db.orm.public.Route.where({ id: trip.routeId }).update({
        isActive: false,
      });
    if (change === 'bus')
      await db.orm.public.Bus.where({ id: trip.busId }).update({
        isActive: false,
      });
    const response = await prepare(hold.id, key);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error.code, 'TRIP_UNAVAILABLE');
    if (change === 'trip')
      await db.orm.public.Trip.where({ id: trip.id }).update({
        status: 'SCHEDULED',
      });
    if (change === 'route')
      await db.orm.public.Route.where({ id: trip.routeId }).update({
        isActive: true,
      });
    if (change === 'bus')
      await db.orm.public.Bus.where({ id: trip.busId }).update({
        isActive: true,
      });
  }
  const expiryHold = await reserve(first, [seats[3]!.id]);
  const past = new Date(Date.now() - 1000).toISOString();
  await db.orm.public.Booking.where({ id: expiryHold.id }).update({
    expiresAt: past,
  });
  const [late, cleanup, fresh] = await Promise.all([
    prepare(expiryHold.id, randomUUID()),
    expireBookingHolds(),
    reserve(second, [seats[3]!.id]),
  ]);
  assert.equal(late.status, 409);
  assert.ok(cleanup.processedTrips >= 0);
  assert.equal(
    (
      await db.orm.public.PaymentAttempt.where({
        bookingId: expiryHold.id,
      }).all()
    ).length,
    0,
  );
  assert.equal(
    (await prepare(fresh.id, randomUUID(), second.token)).status,
    201,
  );
  const expiredBefore = await db.orm.public.Booking.where({
    id: hold.id,
  }).first();
  await db.orm.public.PaymentAttempt.where({ id: stored.id }).update({
    createdAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt: past,
  });
  await db.orm.public.Booking.where({ id: hold.id }).update({
    expiresAt: past,
  });
  assert.equal((await (await read(hold.id)).json()).data.status, 'EXPIRED');
  assert.equal((await prepare(hold.id, key)).status, 409);
  await expireBookingHolds();
  const replacement = await reserve(second, [seats[0]!.id]);
  assert.equal(
    (await prepare(replacement.id, randomUUID(), second.token)).status,
    201,
  );
  assert.equal((await prepare(hold.id, key)).status, 409);
  assert.ok(
    (await db.orm.public.BookingSeat.where({ bookingId: hold.id }).all()).every(
      (s) => s.releasedAt,
    ),
  );
  assert.equal(expiredBefore!.status, 'PENDING_PAYMENT');
  const badSeats = await reserve(first, [seats[4]!.id]);
  await db.orm.public.BookingSeat.where({ bookingId: badSeats.id }).updateAll({
    releasedAt: new Date().toISOString(),
  });
  const badSeatResponse = await prepare(badSeats.id, randomUUID());
  assert.equal(badSeatResponse.status, 409);
  assert.equal(
    (await badSeatResponse.json()).error.code,
    'BOOKING_SEATS_UNAVAILABLE',
  );
  const legacy = await reserve(first, [seats[5]!.id]);
  await db.orm.public.Booking.where({ id: legacy.id }).update({
    status: 'RESERVED',
    expiresAt: null,
  });
  const legacyResponse = await prepare(legacy.id, randomUUID());
  assert.equal(legacyResponse.status, 409);
  assert.equal((await legacyResponse.json()).error.code, 'BOOKING_NOT_PAYABLE');
  const freeTrip = data.trips[1]!;
  await db.orm.public.Trip.where({ id: freeTrip.id }).update({
    pricePiastres: 0,
  });
  const free = await reserve(
    first,
    [data.seats.find((s) => s.busId === freeTrip.busId)!.id],
    freeTrip,
  );
  const freeResponse = await prepare(free.id, randomUUID());
  assert.equal(freeResponse.status, 409);
  assert.equal((await freeResponse.json()).error.code, 'PAYMENT_NOT_REQUIRED');
  const wideTrip = data.trips[3]!;
  await db.orm.public.Trip.where({ id: wideTrip.id }).update({
    pricePiastres: 2147483647,
  });
  const wide = await reserve(first, [seats[0]!.id, seats[1]!.id], wideTrip);
  const wideResponse = await prepare(wide.id, randomUUID());
  assert.equal(wideResponse.status, 201);
  assert.equal((await wideResponse.json()).data.amountPiastres, 4294967294);
  const differentKeys = await reserve(first, [seats[7]!.id]);
  const competing = await Promise.all(
    Array.from({ length: 4 }, () => prepare(differentKeys.id, randomUUID())),
  );
  assert.equal(competing.filter((r) => r.status === 201).length, 1);
  assert.equal(competing.filter((r) => r.status === 409).length, 3);
  assert.equal(
    (
      await db.orm.public.PaymentAttempt.where({
        bookingId: differentKeys.id,
      }).all()
    ).length,
    1,
  );
  const almostExpired = await reserve(first, [seats[8]!.id]);
  await db.orm.public.Booking.where({ id: almostExpired.id }).update({
    expiresAt: new Date(Date.now() + 500).toISOString(),
  });
  const almostResponse = await prepare(almostExpired.id, randomUUID());
  assert.equal(almostResponse.status, 409);
  assert.equal((await almostResponse.json()).error.code, 'BOOKING_EXPIRED');
  assert.equal(
    (
      await db.orm.public.PaymentAttempt.where({
        bookingId: almostExpired.id,
      }).all()
    ).length,
    0,
  );
  const guarded = await reserve(first, [seats[6]!.id]);
  for (const [overrides, constraint] of [
    [{ amountPiastres: 0n }, 'payment_attempt_amount_751e37b6'],
    [{ amountPiastres: 214748364701n }, 'payment_attempt_amount_751e37b6'],
    [{ currency: 'USD' }, 'payment_attempt_amount_751e37b6'],
    [{ idempotencyKey: 'not-a-key' }, 'payment_attempt_key_04039cd6'],
    [{ createdAt: guarded.expiresAt }, 'payment_attempt_expiry_ba6ba4ee'],
  ] as const)
    await assert.rejects(
      db.orm.public.PaymentAttempt.create({
        bookingId: guarded.id,
        idempotencyKey: randomUUID(),
        amountPiastres: 25000n,
        expiresAt: guarded.expiresAt,
        ...overrides,
      }),
      (e) => isCheckViolation(e, constraint),
    );
  assert.equal(
    (await db.orm.public.PaymentAttempt.where({ bookingId: guarded.id }).all())
      .length,
    0,
  );
  await db.orm.public.User.where({ id: first.user.id }).update({
    isActive: false,
  });
  await assert.rejects(
    paymentAttemptService.prepare(first.auth, guarded.id, randomUUID()),
    /Authentication required/,
  );
  await db.orm.public.User.where({ id: first.user.id }).update({
    isActive: true,
    emailVerifiedAt: null,
  });
  await assert.rejects(
    paymentAttemptService.prepare(first.auth, guarded.id, randomUUID()),
    /Authentication required/,
  );
  await db.orm.public.User.where({ id: first.user.id }).update({
    emailVerifiedAt: new Date().toISOString(),
  });
  // Revalidation inside the transaction also protects direct service calls with stale auth.
  await db.orm.public.Session.where({ id: first.session.id }).update({
    revokedAt: new Date().toISOString(),
  });
  await assert.rejects(
    paymentAttemptService.prepare(first.auth, guarded.id, randomUUID()),
    /Authentication required/,
  );
  assert.equal((await prepare(guarded.id, randomUUID())).status, 401);
  assert.equal(
    (await db.orm.public.PaymentAttempt.where({ bookingId: guarded.id }).all())
      .length,
    0,
  );
});
