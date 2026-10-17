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
import { createPaymentAuthorizationService } from '../../src/services/paymentAuthorizationService.ts';
import { decryptCheckout } from '../../src/payments/checkoutEncryption.ts';
import {
  PaymentProviderError,
  type AuthorizationInput,
} from '../../src/payments/paymentProvider.ts';
import {
  isUniqueViolation,
  isCheckViolation,
  isRestrictViolation,
  isForeignKeyViolation,
} from '../../src/utils/databaseErrors.ts';
import { AppError } from '../../src/errors/AppError.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';

test('authorization creation commits before sending, sends once and never resurrects expired seats', async (t) => {
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
        }).all()) {
          const attempt = await db.orm.public.PaymentAttempt.where({
            bookingId: booking.id,
          }).first();
          if (attempt)
            await db.orm.public.PaymentAuthorization.where({
              paymentAttemptId: attempt.id,
            }).deleteAll();
          await db.orm.public.PaymentAttempt.where({
            bookingId: booking.id,
          }).deleteAll();
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
  let nextSeat = 0,
    requests = 0,
    nextOrder = 700000;
  const secret = Buffer.alloc(32, 7);
  const fakeUrl =
    'https://accept.paymob.com/unifiedcheckout/?publicKey=pk_test_fixture&clientSecret=csk_test_fixture';
  const success = () => ({
    intentionId: 'pi_test_' + ++nextOrder,
    orderId: String(nextOrder),
    checkoutUrl: fakeUrl,
  });
  function service(
    send: (input: AuthorizationInput) => Promise<ReturnType<typeof success>>,
    ownerId = 4705,
  ) {
    return createPaymentAuthorizationService({
      provider: {
        createAuthorization: async (input) => {
          requests++;
          return send(input);
        },
      },
      integrationId: 6741,
      ownerId,
      encryptionKey: secret,
    });
  }
  async function prepared() {
    const booking = await reserve(first, [seats[nextSeat++]!.id]);
    await paymentAttemptService.prepare(first.auth, booking.id, randomUUID());
    return booking;
  }
  async function rejects(work: Promise<unknown>, code: string) {
    await assert.rejects(
      work,
      (error: unknown) => error instanceof AppError && error.code === code,
    );
  }
  await t.test(
    'a committed REQUESTING operation prevents concurrent sends, and READY saves encrypted checkout only',
    async () => {
      const booking = await prepared();
      let release!: () => void, entered!: () => void;
      const waiting = new Promise<void>((resolve) => (release = resolve)),
        called = new Promise<void>((resolve) => (entered = resolve));
      const api = service(async (input) => {
        const row = (await db.orm.public.PaymentAuthorization.all())[0]!;
        assert.equal(row.status, 'REQUESTING');
        assert.equal(input.reference, row.id);
        assert.equal(input.amountPiastres, booking.totalPiastres);
        assert.equal(
          Date.parse(input.expiresAt),
          Date.parse(booking.expiresAt),
        );
        assert.equal(input.customer.email, first.user.email);
        assert.equal(input.customer.phone, booking.contactPhone);
        entered();
        await waiting;
        return success();
      });
      const pending = api.start(first.auth, booking.id);
      await Promise.race([
        called,
        pending.then(() => {
          throw new Error('Provider completed before signalling the test gate');
        }),
      ]);
      // A new service instance has no in-memory knowledge of the first request.
      const restarted = service(async () => {
        throw new Error('must never send');
      });
      const duplicates = await Promise.all(
        Array.from({ length: 8 }, () =>
          restarted.start(first.auth, booking.id),
        ),
      );
      assert.ok(duplicates.every((row) => row.status === 'REQUESTING'));
      assert.equal(requests, 1);
      // This must complete while the provider is blocked: no DB transaction spans network I/O.
      await expireBookingHolds();
      release();
      const ready = await pending;
      assert.equal(ready.status, 'READY');
      assert.ok(!JSON.stringify(ready).includes('csk_test'));
      assert.ok(!('checkoutUrl' in ready));
      const row = (await db.orm.public.PaymentAuthorization.where({
        id: ready.id,
      }).first())!;
      assert.equal(row.orderId, String(nextOrder));
      assert.equal(row.intentionId, 'pi_test_' + nextOrder);
      assert.ok(
        row.encryptedCheckoutUrl &&
          !row.encryptedCheckoutUrl.includes('csk_test'),
      );
      assert.equal(
        decryptCheckout(row.id, row.encryptedCheckoutUrl!, secret),
        fakeUrl,
      );
      assert.deepEqual(await restarted.start(first.auth, booking.id), ready);
      assert.equal(requests, 1);
      await rejects(
        service(async () => success(), 9999).start(first.auth, booking.id),
        'PAYMENT_PROVIDER_CHANGED',
      );
      assert.equal(
        (await db.orm.public.Booking.where({ id: booking.id }).first())!.status,
        'PENDING_PAYMENT',
      );
    },
  );
  await t.test(
    'foreign users/staff and missing preparations never reach the provider',
    async () => {
      const booking = await prepared(),
        count = requests;
      const api = service(async () => success());
      await rejects(api.start(second.auth, booking.id), 'BOOKING_NOT_FOUND');
      await rejects(api.start(admin.auth, booking.id), 'BOOKING_NOT_FOUND');
      const plain = await reserve(first, [seats[nextSeat++]!.id]);
      await rejects(
        api.start(first.auth, plain.id),
        'PAYMENT_ATTEMPT_REQUIRED',
      );
      assert.equal(requests, count);
    },
  );
  await t.test(
    'timeouts, malformed results and unexpected errors cannot be blindly retried',
    async () => {
      for (const send of [
        async () => {
          throw new PaymentProviderError(true);
        },
        async () => {
          throw new Error('private upstream secret');
        },
        async () => ({
          ...success(),
          checkoutUrl: 'https://evil.example.test/?clientSecret=private',
        }),
      ]) {
        const booking = await prepared(),
          count = requests;
        const api = service(send);
        const row = await api.start(first.auth, booking.id);
        assert.equal(row.status, 'UNKNOWN');
        assert.deepEqual(await api.start(first.auth, booking.id), row);
        assert.equal(requests, count + 1);
        const saved = (await db.orm.public.PaymentAuthorization.where({
          id: row.id,
        }).first())!;
        assert.equal(saved.encryptedCheckoutUrl, null);
        assert.ok(!JSON.stringify(saved).includes('private'));
      }
      const booking = await prepared(),
        api = service(async () => {
          throw new PaymentProviderError(false);
        }),
        count = requests;
      assert.equal((await api.start(first.auth, booking.id)).status, 'FAILED');
      assert.equal((await api.start(first.auth, booking.id)).status, 'FAILED');
      assert.equal(requests, count + 1);
    },
  );
  await t.test(
    'late success preserves references without checkout and cannot reclaim a reallocated seat',
    async () => {
      const booking = await prepared();
      const allocation = (
        await db.orm.public.BookingSeat.where({ bookingId: booking.id }).all()
      )[0]!;
      let release!: () => void, entered!: () => void;
      const waiting = new Promise<void>((resolve) => (release = resolve)),
        called = new Promise<void>((resolve) => (entered = resolve));
      const api = service(async () => {
        entered();
        await waiting;
        return success();
      });
      const pending = api.start(first.auth, booking.id);
      await Promise.race([
        called,
        pending.then(() => {
          throw new Error('Provider completed before signalling the test gate');
        }),
      ]);
      await db.orm.public.Booking.where({ id: booking.id }).update({
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
      await expireBookingHolds();
      const replacement = await reserve(second, [allocation.seatId]);
      release();
      const result = await pending;
      assert.equal(result.status, 'EXPIRED');
      const saved = (await db.orm.public.PaymentAuthorization.where({
        id: result.id,
      }).first())!;
      assert.ok(saved.orderId && saved.intentionId);
      assert.equal(saved.encryptedCheckoutUrl, null);
      assert.equal(
        (await db.orm.public.Booking.where({ id: booking.id }).first())!.status,
        'EXPIRED',
      );
      assert.equal(
        (await db.orm.public.BookingSeat.where({
          bookingId: replacement.id,
        }).first())!.releasedAt,
        null,
      );
      await rejects(api.start(first.auth, booking.id), 'BOOKING_EXPIRED');
    },
  );
  await t.test(
    'database constraints preserve one operation and complete encrypted/reference state',
    async () => {
      const ready = (await db.orm.public.PaymentAuthorization.where({
        status: 'READY',
      }).first())!;
      await assert.rejects(
        db.orm.public.PaymentAuthorization.create({
          paymentAttemptId: ready.paymentAttemptId,
          integrationId: '6741',
          ownerId: '4705',
        }),
        (e) =>
          isUniqueViolation(e, 'PaymentAuthorization_paymentAttemptId_key'),
      );
      await assert.rejects(
        db.orm.public.PaymentAuthorization.where({ id: ready.id }).update({
          encryptedCheckoutUrl: null,
        }),
        (e) => isCheckViolation(e, 'payment_authorization_checkout_0fc4d81c'),
      );
      await assert.rejects(
        db.orm.public.PaymentAuthorization.where({ id: ready.id }).update({
          orderId: null,
        }),
        (e) => isCheckViolation(e, 'payment_authorization_references_e5a362ee'),
      );
      await assert.rejects(
        db.orm.public.PaymentAuthorization.where({ id: ready.id }).update({
          integrationId: '0',
        }),
        (e) => isCheckViolation(e, 'payment_authorization_scope_37324968'),
      );
      await assert.rejects(
        db.orm.public.PaymentAttempt.where({
          id: ready.paymentAttemptId,
        }).delete(),
        (e) => isRestrictViolation(e) || isForeignKeyViolation(e),
      );
      const unknown = (await db.orm.public.PaymentAuthorization.where({
        status: 'UNKNOWN',
      }).first())!;
      await assert.rejects(
        db.orm.public.PaymentAuthorization.where({ id: unknown.id }).update({
          intentionId: 'pi_test_duplicate_order',
          orderId: ready.orderId,
        }),
        (e) => isUniqueViolation(e, 'PaymentAuthorization_orderId_key'),
      );
    },
  );
  await t.test(
    'changed preparation amounts are rejected before sending',
    async () => {
      const booking = await prepared(),
        count = requests;
      const attempt = (await db.orm.public.PaymentAttempt.where({
        bookingId: booking.id,
      }).first())!;
      await db.orm.public.PaymentAttempt.where({ id: attempt.id }).update({
        amountPiastres: attempt.amountPiastres + 1n,
      });
      await rejects(
        service(async () => success()).start(first.auth, booking.id),
        'PAYMENT_ATTEMPT_MISMATCH',
      );
      assert.equal(requests, count);
      assert.equal(
        await db.orm.public.PaymentAuthorization.where({
          paymentAttemptId: attempt.id,
        }).first(),
        null,
      );
    },
  );
  await t.test('stale revoked sessions cannot create operations', async () => {
    const booking = await prepared(),
      count = requests;
    await db.orm.public.Session.where({ id: first.session.id }).update({
      revokedAt: new Date().toISOString(),
    });
    await rejects(
      service(async () => success()).start(first.auth, booking.id),
      'UNAUTHENTICATED',
    );
    assert.equal(requests, count);
  });
});
