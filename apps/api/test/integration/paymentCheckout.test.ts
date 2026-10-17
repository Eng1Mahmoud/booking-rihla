import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../../src/app.ts';
import { db } from '../../src/prisma/db.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { signAccessToken } from '../../src/utils/sessionTokens.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { paymentAttemptService } from '../../src/services/paymentAttemptService.ts';
import { createPaymentAuthorizationService } from '../../src/services/paymentAuthorizationService.ts';
import { createPaymentCheckoutService } from '../../src/services/paymentCheckoutService.ts';
import { createPaymentReconciliationService } from '../../src/services/paymentReconciliationService.ts';
import { expireBookingHolds } from '../../src/services/bookingHoldService.ts';
import { encryptCheckout } from '../../src/payments/checkoutEncryption.ts';
import {
  PaymentProviderError,
  type AuthorizationInput,
  type PaymentTransaction,
} from '../../src/payments/paymentProvider.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';

test('owned checkout safely exposes an unexpired link and reads durable payment outcomes without provider calls', async (t) => {
  const namespace = 'checkout-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace),
    users: string[] = [];
  const scope = { integrationId: 6741, ownerId: 4705 },
    key = Buffer.alloc(32, 9),
    checkoutUrl =
      'https://accept.paymob.com/unifiedcheckout/?publicKey=pk_test_fixture&clientSecret=csk_test_private_fixture';
  let creates = 0,
    queries = 0,
    captures = 0,
    voids = 0,
    nextNumber = 830000;
  let onCreate: ((input: AuthorizationInput) => Promise<void>) | undefined;
  let onCapture: (() => Promise<void>) | undefined;
  const transactions = new Map<string, PaymentTransaction>(),
    referenceToId = new Map<string, string>();
  const provider = {
    async createAuthorization(input: AuthorizationInput) {
      creates++;
      if (onCreate) await onCreate(input);
      const id = String(++nextNumber),
        orderId = String(nextNumber + 100000);
      referenceToId.set(input.reference, id);
      transactions.set(id, {
        id,
        orderId,
        ...scope,
        amountPiastres: input.amountPiastres,
        currency: 'EGP',
        pending: false,
        success: true,
        authorization: true,
        capture: false,
        voided: false,
        refunded: false,
        standalone: false,
        live: false,
        capturedPiastres: 0,
      });
      return { intentionId: 'pi_test_' + id, orderId, checkoutUrl };
    },
    async getTransaction(id: string) {
      queries++;
      return { ...transactions.get(id)! };
    },
    async getTransactionByReference(reference: string) {
      queries++;
      return { ...transactions.get(referenceToId.get(reference)!)!, reference };
    },
    async capture(id: string, amount: number) {
      captures++;
      if (onCapture) await onCapture();
      transactions.get(id)!.capturedPiastres = amount;
    },
    async voidAuthorization(id: string) {
      voids++;
      transactions.get(id)!.voided = true;
    },
  };
  const authorizations = createPaymentAuthorizationService({
    provider,
    ...scope,
    encryptionKey: key,
  });
  const checkout = createPaymentCheckoutService({
    authorizations,
    ...scope,
    publicKey: 'pk_test_fixture',
    encryptionKey: key,
  });
  const reconciliation = createPaymentReconciliationService(provider, scope);
  const server = createApp([], { paymentCheckout: checkout }).listen(
    0,
    '127.0.0.1',
  );
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
            if (operation)
              await db.orm.public.PaymentSettlement.where({
                authorizationId: operation.id,
              }).deleteAll();
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
  const base = 'http://127.0.0.1:' + address.port + '/api/v1/bookings/';
  await seedDemo('2099-01-01', namespace);
  async function account(role: 'USER' | 'ADMIN' = 'USER') {
    const user = await db.orm.public.User.create({
      name: 'Checkout test',
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
  const owner = await account(),
    other = await account(),
    admin = await account('ADMIN');
  const trip = data.trips[0]!,
    seats = data.seats
      .filter((s) => s.busId === trip.busId)
      .sort((a, b) => a.number - b.number);
  let nextSeat = 0;
  async function reserve(seatId = seats[nextSeat++]!.id, who = owner) {
    return bookingService.create(who.auth, {
      tripId: trip.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId, name: 'Passenger' }],
    });
  }
  async function prepared() {
    const booking = await reserve();
    await paymentAttemptService.prepare(owner.auth, booking.id, randomUUID());
    return booking;
  }
  type Booking = Awaited<ReturnType<typeof prepared>>;
  async function post(id: string, who = owner) {
    return fetch(base + id + '/checkout', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + who.token,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
  }
  async function read(id: string, who = owner) {
    return fetch(base + id + '/payment', {
      headers: { Authorization: 'Bearer ' + who.token },
    });
  }
  async function operation(booking: Booking) {
    const attempt = (await db.orm.public.PaymentAttempt.where({
      bookingId: booking.id,
    }).first())!;
    return (await db.orm.public.PaymentAuthorization.where({
      paymentAttemptId: attempt.id,
    }).first())!;
  }
  async function expire(booking: Booking) {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    await db.orm.public.Booking.where({ id: booking.id }).update({ expiresAt });
    await db.orm.public.PaymentAttempt.where({ bookingId: booking.id }).update({
      expiresAt,
      createdAt: new Date(Date.now() - 20000).toISOString(),
    });
    await expireBookingHolds();
  }
  async function status(id: string) {
    const before = { queries, captures, voids, creates },
      response = await read(id);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const value = (await response.json()).data;
    assert.deepEqual({ queries, captures, voids, creates }, before);
    for (const field of [
      'checkoutUrl',
      'encryptedCheckoutUrl',
      'orderId',
      'intentionId',
      'transactionId',
      'ownerId',
      'integrationId',
    ])
      assert.ok(!(field in value));
    assert.ok(!JSON.stringify(value).includes('private'));
    return value;
  }
  await t.test(
    'preparation is required; concurrent HTTP starts create one operation and resume the same encrypted checkout',
    async () => {
      const booking = await reserve(),
        before = creates;
      assert.equal((await status(booking.id)).paymentStatus, 'NOT_STARTED');
      assert.equal((await post(booking.id)).status, 409);
      assert.equal(creates, before);
      await paymentAttemptService.prepare(owner.auth, booking.id, randomUUID());
      assert.equal((await status(booking.id)).paymentStatus, 'PREPARED');
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => post(booking.id)),
      );
      for (const response of responses) {
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        const result = (await response.json()).data;
        assert.ok(
          result.checkoutUrl === null || result.checkoutUrl === checkoutUrl,
        );
        assert.equal(result.amountPiastres, booking.totalPiastres);
        assert.equal(result.expiresAt, booking.expiresAt);
      }
      assert.equal(creates, before + 1);
      const again = (await (await post(booking.id)).json()).data;
      assert.equal(again.checkoutUrl, checkoutUrl);
      assert.equal(creates, before + 1);
      const stored = await operation(booking);
      assert.ok(stored.encryptedCheckoutUrl);
      assert.ok(!stored.encryptedCheckoutUrl.includes('csk_test'));
      assert.equal(
        (await status(booking.id)).paymentStatus,
        'AWAITING_PAYMENT',
      );
    },
  );
  await t.test(
    'another passenger, an administrator and a missing UUID cannot read or start the owner checkout',
    async () => {
      const booking = await prepared(),
        before = creates;
      for (const who of [other, admin]) {
        assert.equal((await read(booking.id, who)).status, 404);
        assert.equal((await post(booking.id, who)).status, 404);
      }
      assert.equal((await read(randomUUID())).status, 404);
      assert.equal((await post(randomUUID())).status, 404);
      assert.equal(creates, before);
    },
  );
  await t.test(
    'expired holds cannot start or resume checkout; an ambiguous timeout is never resent or returned as a URL',
    async () => {
      const expired = await prepared(),
        before = creates;
      await expire(expired);
      assert.equal((await post(expired.id)).status, 409);
      assert.equal(creates, before);
      assert.equal((await status(expired.id)).paymentStatus, 'EXPIRED');
      const unknown = await prepared();
      onCreate = async () => {
        throw new PaymentProviderError(true);
      };
      for (let i = 0; i < 2; i++) {
        const response = await post(unknown.id);
        assert.equal(response.status, 200);
        const result = (await response.json()).data;
        assert.equal(result.checkoutUrl, null);
        assert.equal(result.paymentStatus, 'UNKNOWN');
      }
      assert.equal(creates, before + 1);
      assert.equal((await status(unknown.id)).paymentStatus, 'UNKNOWN');
      onCreate = undefined;
    },
  );
  await t.test(
    'expiry and reallocation during provider I/O cannot expose a late checkout or reclaim seats',
    async () => {
      const booking = await prepared();
      let replacement: Booking | undefined;
      onCreate = async () => {
        // This would deadlock if creation held the Trip lock across network I/O.
        await expire(booking);
        const seat = (await db.orm.public.BookingSeat.where({
          bookingId: booking.id,
        }).first())!;
        replacement = await reserve(seat.seatId, other);
      };
      assert.equal((await post(booking.id)).status, 409);
      onCreate = undefined;
      const row = await operation(booking);
      assert.equal(row.status, 'EXPIRED');
      assert.equal(row.encryptedCheckoutUrl, null);
      assert.ok(row.orderId);
      assert.equal(
        (await db.orm.public.BookingSeat.where({
          bookingId: replacement!.id,
        }).first())!.releasedAt,
        null,
      );
      assert.equal((await status(booking.id)).bookingStatus, 'EXPIRED');
    },
  );
  await t.test(
    'only reconciliation confirms payment; status polling has no provider side effects and checkout closes during capture',
    async () => {
      const booking = await prepared();
      await checkout.start(owner.auth, booking.id);
      const op = await operation(booking);
      let enter!: () => void, release!: () => void;
      const entered = new Promise<void>((r) => {
          enter = r;
        }),
        waiting = new Promise<void>((r) => {
          release = r;
        });
      onCapture = async () => {
        enter();
        await waiting;
      };
      const pending = reconciliation.reconcile(op.id);
      await Promise.race([
        entered,
        pending.then(() => {
          throw new Error('Capture did not enter');
        }),
      ]);
      try {
        assert.equal((await status(booking.id)).paymentStatus, 'PROCESSING');
        await assert.rejects(
          checkout.start(owner.auth, booking.id),
          (error: unknown) =>
            error instanceof Error &&
            'code' in error &&
            error.code === 'BOOKING_NOT_PAYABLE',
        );
        await expire(booking);
        assert.equal(
          (await status(booking.id)).bookingStatus,
          'PAYMENT_PROCESSING',
        );
      } finally {
        release();
      }
      await pending;
      onCapture = undefined;
      const result = await status(booking.id);
      assert.equal(result.paymentStatus, 'PAID');
      assert.equal(result.bookingStatus, 'CONFIRMED');
      assert.equal((await operation(booking)).encryptedCheckoutUrl, null);
    },
  );
  await t.test(
    'late authorization reads VOIDED and unexpected partial capture reads REVIEW, neither falsely reads PAID',
    async () => {
      const late = await prepared();
      await checkout.start(owner.auth, late.id);
      await expire(late);
      const before = captures;
      await reconciliation.reconcile((await operation(late)).id);
      assert.equal(captures, before);
      assert.equal((await status(late.id)).paymentStatus, 'VOIDED');
      const partial = await prepared();
      await checkout.start(owner.auth, partial.id);
      const op = await operation(partial);
      transactions.get(referenceToId.get(op.id)!)!.capturedPiastres = 1;
      await reconciliation.reconcile(op.id);
      assert.equal((await status(partial.id)).paymentStatus, 'REVIEW');
      assert.equal(captures, before);
    },
  );
  await t.test(
    'corrupted ciphertext and unexpected checkout hosts stay private; changed public key cannot expose an existing URL',
    async () => {
      const booking = await prepared();
      await checkout.start(owner.auth, booking.id);
      const op = await operation(booking),
        before = creates;
      const changed = createPaymentCheckoutService({
        authorizations,
        ...scope,
        publicKey: 'pk_test_changed',
        encryptionKey: key,
      });
      await assert.rejects(
        changed.start(owner.auth, booking.id),
        (error: unknown) =>
          error instanceof Error &&
          'code' in error &&
          error.code === 'PAYMENT_PROVIDER_CHANGED',
      );
      for (const ciphertext of [
        'v1.corrupt.private.secret',
        encryptCheckout(op.id, 'https://evil.test/private', key),
      ]) {
        await db.orm.public.PaymentAuthorization.where({ id: op.id }).update({
          encryptedCheckoutUrl: ciphertext,
        });
        const response = await post(booking.id);
        assert.equal(response.status, 500);
        assert.ok(!JSON.stringify(await response.json()).includes('private'));
      }
      assert.equal(creates, before);
      assert.equal(
        (await status(booking.id)).paymentStatus,
        'AWAITING_PAYMENT',
      );
    },
  );
  await t.test(
    'session revocation during creation returns no checkout and later reads are unauthenticated',
    async () => {
      const booking = await prepared();
      onCreate = async () => {
        await db.orm.public.Session.where({ id: owner.session.id }).update({
          revokedAt: new Date().toISOString(),
        });
      };
      // Use the service directly to keep this scenario independent of HTTP rate limits.
      await assert.rejects(
        checkout.start(owner.auth, booking.id),
        (error: unknown) =>
          error instanceof Error &&
          'code' in error &&
          error.code === 'UNAUTHENTICATED',
      );
      onCreate = undefined;
      assert.equal((await operation(booking)).encryptedCheckoutUrl, null);
      assert.equal((await read(booking.id)).status, 401);
    },
  );
});
