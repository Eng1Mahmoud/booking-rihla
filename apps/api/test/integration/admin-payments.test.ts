import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { paymentAttemptService } from '../../src/services/paymentAttemptService.ts';
import { adminPaymentService } from '../../src/services/adminPaymentService.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';
import { cairoDayBounds } from '../../src/utils/cairoTime.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';

test('administrator payment reads filter durable records, preserve history and protect owner checkout', async (t) => {
  const namespace = 'admin-payments-' + randomUUID(),
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
        }).all()) {
          const attempt = await db.orm.public.PaymentAttempt.where({
            bookingId: booking.id,
          }).first();
          if (attempt) {
            const operation = await db.orm.public.PaymentAuthorization.where({
              paymentAttemptId: attempt.id,
            }).first();
            if (operation) {
              await db.orm.public.PaymentSettlement.where({
                authorizationId: operation.id,
              }).deleteAll();
              if (operation.orderId)
                await db.orm.public.PaymentEvent.where({
                  orderId: operation.orderId,
                }).deleteAll();
            }
            await db.orm.public.PaymentAuthorization.where({
              paymentAttemptId: attempt.id,
            }).deleteAll();
            await db.orm.public.PaymentAttempt.where({
              id: attempt.id,
            }).delete();
          }
        }
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
  async function account(role: 'USER' | 'ADMIN' | 'SUPER_ADMIN' = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Payment account',
      email: randomUUID() + '@example.test',
      phone: '+201012345678',
      passwordHash: 'private-password-hash',
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
  const owner = await account(),
    other = await account(),
    admin = await account('ADMIN'),
    superAdmin = await account('SUPER_ADMIN');
  const trip = data.trips[0]!,
    secondTrip = data.trips[1]!,
    seats = data.seats
      .filter((s) => s.busId === trip.busId)
      .sort((a, b) => a.number - b.number);
  let nextSeat = 0,
    nextProvider = 960000;
  async function fixture(
    kind:
      | 'PREPARED'
      | 'READY'
      | 'PAID'
      | 'REVIEW'
      | 'UNKNOWN'
      | 'PROCESSING'
      | 'VOIDED',
    who = owner,
    target = trip,
  ) {
    const seat =
      target.id === trip.id
        ? seats[nextSeat++]!
        : data.seats.find((s) => s.busId === target.busId)!;
    const booking = await bookingService.create(who.auth, {
      tripId: target.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId: seat.id, name: 'Passenger' }],
    });
    const attempt = (
      await paymentAttemptService.prepare(who.auth, booking.id, randomUUID())
    ).data;
    if (kind !== 'PREPARED') {
      const number = ++nextProvider,
        terminal = kind === 'PAID' || kind === 'REVIEW' || kind === 'VOIDED';
      const operation = await db.orm.public.PaymentAuthorization.create({
        paymentAttemptId: attempt.id,
        integrationId: '6741',
        ownerId: '4705',
        intentionId: kind === 'UNKNOWN' ? null : 'pi_test_' + number,
        orderId: kind === 'UNKNOWN' ? null : String(number),
        status: terminal ? 'EXPIRED' : kind === 'UNKNOWN' ? 'UNKNOWN' : 'READY',
        encryptedCheckoutUrl:
          terminal || kind === 'UNKNOWN' ? null : 'private-checkout-ciphertext',
        reconciliationComplete: terminal,
      });
      if (['PAID', 'REVIEW', 'PROCESSING', 'VOIDED'].includes(kind)) {
        await db.orm.public.PaymentSettlement.create({
          authorizationId: operation.id,
          transactionId: String(number + 100000),
          kind: kind === 'VOIDED' ? 'VOID' : 'CAPTURE',
          status:
            kind === 'REVIEW'
              ? 'REVIEW'
              : kind === 'PROCESSING'
                ? 'UNKNOWN'
                : 'SUCCEEDED',
          amountPiastres: BigInt(attempt.amountPiastres),
        });
        await db.orm.public.Booking.where({ id: booking.id }).update({
          status:
            kind === 'PAID'
              ? 'CONFIRMED'
              : kind === 'VOIDED'
                ? 'EXPIRED'
                : 'PAYMENT_PROCESSING',
        });
      }
      if (operation.orderId)
        await db.orm.public.PaymentEvent.create({
          eventKey: randomUUID().replaceAll('-', '').repeat(2),
          transactionId: String(number + 100000),
          orderId: operation.orderId,
          integrationId: '6741',
          ownerId: '4705',
          signedJson: '{"private-raw-callback":"not-for-admin-output"}',
        });
    }
    return { booking, attempt };
  }
  const prepared = await fixture('PREPARED'),
    ready = await fixture('READY'),
    paid = await fixture('PAID'),
    review = await fixture('REVIEW'),
    unknown = await fixture('UNKNOWN'),
    processing = await fixture('PROCESSING'),
    voided = await fixture('VOIDED'),
    different = await fixture('PREPARED', other, secondTrip);
  const fixtures = [
    prepared,
    ready,
    paid,
    review,
    unknown,
    processing,
    voided,
    different,
  ];
  const paymentPath = (id: string) => '/admin/payments/' + id;
  async function get(path: string, who = admin) {
    return fetch(base + path, {
      headers: { Authorization: 'Bearer ' + who.token },
    });
  }
  async function read(path: string, who = admin) {
    const response = await get(path, who);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return (await response.json()).data;
  }
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
  function privateFieldsAbsent(value: unknown) {
    const text = JSON.stringify(value);
    for (const forbidden of [
      'private-',
      'checkoutUrl',
      'encryptedCheckoutUrl',
      'passwordHash',
      'idempotencyKey',
      'signedJson',
      'sessionId',
      'contactPhone',
      'refreshToken',
    ])
      assert.ok(!text.includes(forbidden), forbidden);
  }
  async function snapshot() {
    return {
      attempts: await db.orm.public.PaymentAttempt.orderBy((p) =>
        p.id.asc(),
      ).all(),
      operations: await db.orm.public.PaymentAuthorization.orderBy((p) =>
        p.id.asc(),
      ).all(),
      settlements: await db.orm.public.PaymentSettlement.orderBy((p) =>
        p.id.asc(),
      ).all(),
      seats: await db.orm.public.BookingSeat.orderBy((p) => p.id.asc()).all(),
      bookings: await db.orm.public.Booking.orderBy((p) => p.id.asc()).all(),
      events: await db.orm.public.PaymentEvent.orderBy((p) => p.id.asc()).all(),
    };
  }
  await t.test(
    'anonymous and passenger requests fail before validation; both staff roles can read',
    async () => {
      assert.equal((await fetch(base + '/admin/payments/bad')).status, 401);
      assert.equal((await get('/admin/payments/bad', owner)).status, 403);
      assert.equal(
        (await get('/admin/payments?role=SUPER_ADMIN', owner)).status,
        403,
      );
      assert.equal(
        (await read('/admin/payments', superAdmin)).length,
        fixtures.length,
      );
      assert.equal((await read('/admin/payments')).length, fixtures.length);
    },
  );
  await t.test(
    'details expose precise states and provider references while retaining passenger ownership',
    async () => {
      for (const [c, expected] of [
        [prepared, 'PREPARED'],
        [ready, 'AWAITING_PAYMENT'],
        [paid, 'PAID'],
        [review, 'REVIEW'],
        [unknown, 'UNKNOWN'],
        [processing, 'PROCESSING'],
        [voided, 'VOIDED'],
      ] as const) {
        const row = await read(paymentPath(c.attempt.id));
        assert.equal(row.id, c.attempt.id);
        assert.equal(row.bookingId, c.booking.id);
        assert.equal(row.paymentStatus, expected);
        assert.equal(row.amountPiastres, c.attempt.amountPiastres);
        assert.equal(row.requiresReview, expected === 'REVIEW');
        privateFieldsAbsent(row);
        assert.deepEqual(Object.keys(row.customer).sort(), [
          'email',
          'id',
          'name',
        ]);
        const ownerStatus = await read(
          '/bookings/' + c.booking.id + '/payment',
          owner,
        );
        assert.equal(row.paymentStatus, ownerStatus.paymentStatus);
      }
      const row = await read(paymentPath(paid.attempt.id));
      assert.ok(row.authorization.orderId);
      assert.ok(row.authorization.intentionId);
      assert.ok(row.settlement.transactionId);
      assert.equal(row.authorization.status, 'EXPIRED');
      assert.equal(row.settlement.status, 'SUCCEEDED');
      assert.equal(row.paymentStatus, 'PAID');
      assert.equal(
        (await get('/bookings/' + ready.booking.id + '/payment')).status,
        404,
      );
      assert.equal(
        (await get('/bookings/' + ready.booking.id + '/payment', superAdmin))
          .status,
        404,
      );
      assert.equal((await get(paymentPath(randomUUID()))).status, 404);
      assert.equal((await get(paymentPath(ready.booking.id))).status, 404);
    },
  );
  await t.test(
    'exact relation filters combine with AND and find creation, settlement and review records',
    async () => {
      const row = await read(paymentPath(paid.attempt.id));
      const filters = [
        ['bookingId', paid.booking.id, [paid.attempt.id]],
        ['reference', paid.booking.reference.toLowerCase(), [paid.attempt.id]],
        ['orderId', row.authorization.orderId, [paid.attempt.id]],
        ['intentionId', row.authorization.intentionId, [paid.attempt.id]],
        ['transactionId', row.settlement.transactionId, [paid.attempt.id]],
        ['settlementStatus', 'REVIEW', [review.attempt.id]],
        ['settlementKind', 'VOID', [voided.attempt.id]],
        ['authorizationStatus', 'UNKNOWN', [unknown.attempt.id]],
        ['userId', other.user.id, [different.attempt.id]],
        ['email', other.user.email.toUpperCase(), [different.attempt.id]],
        ['tripId', secondTrip.id, [different.attempt.id]],
      ] as const;
      for (const [key, value, expected] of filters)
        assert.deepEqual(
          ids(
            await read(
              '/admin/payments?' + new URLSearchParams({ [key]: value }),
            ),
          ),
          [...expected],
          key,
        );
      const combined = new URLSearchParams({
        bookingId: paid.booking.id,
        reference: paid.booking.reference,
        userId: owner.user.id,
        email: owner.user.email,
        tripId: trip.id,
        orderId: row.authorization.orderId,
        intentionId: row.authorization.intentionId,
        transactionId: row.settlement.transactionId,
        authorizationStatus: 'EXPIRED',
        settlementStatus: 'SUCCEEDED',
        settlementKind: 'CAPTURE',
      });
      assert.deepEqual(ids(await read('/admin/payments?' + combined)), [
        paid.attempt.id,
      ]);
      combined.set('settlementKind', 'VOID');
      assert.deepEqual(await read('/admin/payments?' + combined), []);
      assert.deepEqual(
        await read(
          '/admin/payments?bookingId=' +
            prepared.booking.id +
            '&settlementStatus=REVIEW',
        ),
        [],
      );
      assert.deepEqual(await read('/admin/payments?orderId=999999999'), []);
    },
  );
  await t.test(
    'creation-day filtering uses Cairo DST boundaries and deterministic pagination handles tied timestamps',
    async () => {
      const day = '2025-10-30',
        { start, end } = cairoDayBounds(day);
      assert.equal(Date.parse(end) - Date.parse(start), 25 * 3600000);
      // Use a past DST date, before the persisted snapshot expiry.
      const positions = [
        new Date(Date.parse(start) - 1).toISOString(),
        start,
        new Date(Date.parse(end) - 1).toISOString(),
        end,
      ];
      const selected = [prepared, ready, paid, review];
      for (let i = 0; i < selected.length; i++)
        await db.orm.public.PaymentAttempt.where({
          id: selected[i]!.attempt.id,
        }).update({ createdAt: positions[i]! });
      assert.deepEqual(ids(await read('/admin/payments?createdDate=' + day)), [
        paid.attempt.id,
        ready.attempt.id,
      ]);
      const tied = '2025-10-29T12:00:00.000Z';
      for (const c of selected)
        await db.orm.public.PaymentAttempt.where({ id: c.attempt.id }).update({
          createdAt: tied,
        });
      const ordered = selected
        .map((c) => c.attempt.id)
        .sort()
        .reverse();
      const response = await get(
        '/admin/payments?createdDate=2025-10-29&limit=2&offset=1',
      );
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.deepEqual(ids(result.data), ordered.slice(1, 3));
      assert.deepEqual(result.pagination, { limit: 2, offset: 1 });
    },
  );
  await t.test(
    'list/detail reads never reconcile, decrypt or alter financial and allocation history',
    async () => {
      const before = await snapshot();
      const list = await read('/admin/payments');
      privateFieldsAbsent(list);
      for (const c of fixtures)
        privateFieldsAbsent(await read(paymentPath(c.attempt.id)));
      assert.deepEqual(await snapshot(), before);
    },
  );
  await t.test(
    'malformed inputs and financial mutation attempts do not change data',
    async () => {
      const before = await snapshot();
      for (const path of [
        '/admin/payments?orderId=0',
        '/admin/payments?settlementStatus=PAID',
        '/admin/payments/bad',
        paymentPath(paid.attempt.id) + '?checkout=1',
      ])
        assert.equal((await get(path)).status, 400);
      for (const [method, path] of [
        ['POST', '/admin/payments'],
        ['PATCH', paymentPath(paid.attempt.id)],
        ['DELETE', paymentPath(paid.attempt.id)],
        ['POST', paymentPath(review.attempt.id) + '/retry'],
        ['POST', paymentPath(paid.attempt.id) + '/refund'],
        ['POST', paymentPath(ready.attempt.id) + '/capture'],
      ])
        assert.equal(
          (
            await fetch(base + path, {
              method,
              headers: {
                Authorization: 'Bearer ' + admin.token,
                'Content-Type': 'application/json',
              },
              body: '{}',
            })
          ).status,
          404,
        );
      assert.deepEqual(await snapshot(), before);
    },
  );
  await t.test(
    'a changed role, suspended account or revoked session cannot retain administrator access',
    async () => {
      await db.orm.public.User.where({ id: admin.user.id }).update({
        role: 'USER',
      });
      assert.equal((await get('/admin/payments')).status, 403);
      await db.orm.public.User.where({ id: admin.user.id }).update({
        role: 'ADMIN',
        isActive: false,
      });
      assert.equal((await get('/admin/payments')).status, 401);
      await db.orm.public.User.where({ id: admin.user.id }).update({
        isActive: true,
      });
      assert.equal((await get('/admin/payments')).status, 200);
      await db.orm.public.Session.where({ id: admin.session.id }).update({
        revokedAt: new Date().toISOString(),
      });
      assert.equal((await get('/admin/payments')).status, 401);
      assert.equal((await get('/admin/payments', superAdmin)).status, 200);
      assert.equal(await adminPaymentService.findById(randomUUID()), null);
    },
  );
});
