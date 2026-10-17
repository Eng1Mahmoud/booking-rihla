import { processTicketOutbox } from '../../src/services/ticketOutboxService.ts';
import { ticketEmail } from '../../src/emails/ticketEmail.ts';
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
import { createPaymentReconciliationService } from '../../src/services/paymentReconciliationService.ts';
import { paymobWebhookService } from '../../src/services/paymobWebhookService.ts';
import { expireBookingHolds } from '../../src/services/bookingHoldService.ts';
import { tripDetailsService } from '../../src/services/tripDetailsService.ts';
import {
  PaymentProviderError,
  type PaymentTransaction,
} from '../../src/payments/paymentProvider.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';
import {
  callbackFixture,
  signCallback,
  webhookEnvironment,
} from '../helpers/paymobFixture.ts';
test('verified payment reconciliation captures once, protects seats and voids late authorizations', async (t) => {
  const oldEnvironment = Object.fromEntries(
    Object.keys(webhookEnvironment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, webhookEnvironment);
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
          }
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
      for (const [key, value] of Object.entries(oldEnvironment)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
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
    trip = data.trips[0]!;
  const seats = data.seats
    .filter((s) => s.busId === trip.busId)
    .sort((a, b) => a.number - b.number);
  let serviceFixtures = false;
  async function reserve(
    owner = first,
    seatIds = [seats[0]!.id],
    target = trip,
  ) {
    if (serviceFixtures)
      return bookingService.create(owner.auth, {
        tripId: target.id,
        contactPhone: '+201012345678',
        passengers: seatIds.map((seatId) => ({ seatId, name: 'Passenger' })),
      });
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
    nextId = 910000;
  const remote = new Map<string, PaymentTransaction>();
  const calls = { capture: 0, void: 0, inquiry: 0 };
  let onCapture: ((id: string, amount: number) => Promise<void>) | undefined;
  let onVoid: ((id: string) => Promise<void>) | undefined;
  let onInquiry: ((id: string) => Promise<PaymentTransaction>) | undefined;
  const provider = {
    async getTransaction(id: string) {
      calls.inquiry++;
      return onInquiry ? onInquiry(id) : { ...remote.get(id)! };
    },
    async capture(id: string, amount: number) {
      calls.capture++;
      if (onCapture) await onCapture(id, amount);
      else remote.get(id)!.capturedPiastres = amount;
    },
    async voidAuthorization(id: string) {
      calls.void++;
      if (onVoid) await onVoid(id);
      else remote.get(id)!.voided = true;
    },
  };
  const scope = { integrationId: 6741, ownerId: 4705 };
  const service = createPaymentReconciliationService(provider, scope);
  async function ready(notify = true, lostResponse = false) {
    const booking = await reserve(first, [seats[nextSeat++]!.id]);
    const attempt = (
      await paymentAttemptService.prepare(first.auth, booking.id, randomUUID())
    ).data;
    const number = ++nextId,
      id = String(number),
      orderId = String(number + 100000);
    const result = await createPaymentAuthorizationService({
      provider: {
        createAuthorization: async () => {
          if (lostResponse) throw new PaymentProviderError(true);
          return {
            intentionId: 'pi_test_' + id,
            orderId,
            checkoutUrl:
              'https://accept.paymob.com/unifiedcheckout/?publicKey=pk_test_fixture&clientSecret=csk_test_fixture',
          };
        },
      },
      ...scope,
      encryptionKey: Buffer.alloc(32, 7),
    }).start(first.auth, booking.id);
    const value: PaymentTransaction = {
      id,
      orderId,
      ...scope,
      amountPiastres: booking.totalPiastres,
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
    };
    remote.set(id, value);
    const context = { booking, attempt, id, orderId, operationId: result.id };
    if (notify) await notifyEvent(context);
    return context;
  }
  type Context = Awaited<ReturnType<typeof ready>>;
  async function notifyEvent(
    c: { id: string; orderId: string; booking: { totalPiastres: number } },
    patch: Partial<typeof callbackFixture.obj> = {},
  ) {
    const event = {
      ...callbackFixture,
      obj: {
        ...callbackFixture.obj,
        id: Number(c.id),
        order: { id: Number(c.orderId) },
        amount_cents: c.booking.totalPiastres,
        ...patch,
      },
    };
    await paymobWebhookService.receive(event, signCallback(event));
  }
  async function expire(c: Context) {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    await db.orm.public.Booking.where({ id: c.booking.id }).update({
      expiresAt,
    });
    await db.orm.public.PaymentAttempt.where({ id: c.attempt.id }).update({
      expiresAt,
      createdAt: new Date(Date.now() - 20000).toISOString(),
    });
    await expireBookingHolds();
  }
  const bookingRow = (c: Context) =>
    db.orm.public.Booking.where({ id: c.booking.id }).first();
  const settlement = (c: Context) =>
    db.orm.public.PaymentSettlement.where({
      authorizationId: c.operationId,
    }).first();
  await t.test(
    'signed receipt alone does not confirm; concurrent workers capture exactly once and inquiry confirms',
    async () => {
      const c = await ready(),
        before = calls.capture;
      assert.equal((await bookingRow(c))!.status, 'PENDING_PAYMENT');
      await Promise.all(Array.from({ length: 6 }, () => notifyEvent(c)));
      assert.equal(
        (await db.orm.public.PaymentEvent.where({ orderId: c.orderId }).all())
          .length,
        1,
      );
      await Promise.all(
        Array.from({ length: 6 }, () =>
          createPaymentReconciliationService(provider, scope).reconcile(
            c.operationId,
          ),
        ),
      );
      assert.equal(calls.capture, before + 1);
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
      assert.equal((await settlement(c))!.status, 'SUCCEEDED');
      assert.equal((await settlement(c))!.kind, 'CAPTURE');
      const ownRead = await fetch(base + '/bookings/' + c.booking.id, {
        headers: { Authorization: 'Bearer ' + first.token },
      });
      assert.equal(ownRead.status, 200);
      const ownData = (await ownRead.json()).data;
      assert.equal(ownData.status, 'CONFIRMED');
      assert.equal(ownData.paymentRequired, false);
      const issued = await db.orm.public.Ticket.where({
        bookingId: c.booking.id,
      }).all();
      assert.equal(issued.length, 1);
      assert.equal(issued[0]!.sentAt, null);
      const url = base + '/bookings/' + c.booking.id + '/ticket';
      assert.equal((await fetch(url)).status, 401);
      assert.equal(
        (
          await fetch(url, {
            headers: { Authorization: 'Bearer ' + second.token },
          })
        ).status,
        404,
      );
      const staff = await account('ADMIN');
      assert.equal(
        (
          await fetch(url, {
            headers: { Authorization: 'Bearer ' + staff.token },
          })
        ).status,
        404,
      );
      const read = await fetch(url, {
        headers: { Authorization: 'Bearer ' + first.token },
      });
      assert.equal(read.status, 200);
      assert.equal(read.headers.get('cache-control'), 'no-store');
      const ticket = (await read.json()).data;
      assert.equal(ticket.id, issued[0]!.id);
      assert.equal(ticket.reference, c.booking.reference);
      assert.equal(ticket.totalPiastres, c.booking.totalPiastres);
      assert.deepEqual(ticket.passengers, [
        { name: 'Passenger', seatNumber: seats[0]!.number },
      ]);
      assert.equal(ticket.qr.payload, 'BUS-TICKET:v1:' + issued[0]!.id);
      assert.match(ticket.qr.imageDataUrl, /^data:image\/png;base64,/);
      assert.deepEqual(
        Buffer.from(ticket.qr.imageDataUrl.split(',')[1], 'base64').subarray(
          0,
          8,
        ),
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      );
      for (const field of [
        'email',
        'contactPhone',
        'orderId',
        'encryptedCheckoutUrl',
        'idempotencyKey',
      ])
        assert.equal(field in ticket, false);
      const bad = await fetch(url + '?userId=' + first.user.id, {
        headers: { Authorization: 'Bearer ' + first.token },
      });
      assert.equal(bad.status, 400);
      const fail = await processTicketOutbox(async () => {
        throw new Error('SMTP private error');
      });
      assert.deepEqual(fail, { sent: 0, failed: 1, discarded: 0 });
      const delayed = (await db.orm.public.Ticket.where({
        id: ticket.id,
      }).first())!;
      assert.equal(delayed.attempts, 1);
      assert.ok(Date.parse(delayed.nextAttemptAt) > Date.now());
      let sent = 0;
      assert.equal(
        (
          await processTicketOutbox(async () => {
            sent++;
          })
        ).sent,
        0,
      );
      await db.orm.public.Ticket.where({ id: ticket.id }).update({
        nextAttemptAt: new Date(0).toISOString(),
      });
      await Promise.all([
        processTicketOutbox(async (message) => {
          sent++;
          assert.equal(message.email, first.user.email);
          assert.equal(message.ticket.id, ticket.id);
          assert.match(ticketEmail(message.ticket, 'en').text, /Africa\/Cairo/);
          assert.match(ticketEmail(message.ticket, 'ar').subject, /تذكرة/);
        }),
        processTicketOutbox(async () => {
          sent++;
        }),
      ]);
      assert.equal(sent, 1);
      assert.ok(
        (await db.orm.public.Ticket.where({ id: ticket.id }).first())!.sentAt,
      );
      await processTicketOutbox(async () => {
        sent++;
      });
      assert.equal(sent, 1);
      await db.orm.public.Session.where({ id: first.session.id }).update({
        revokedAt: new Date().toISOString(),
      });
      assert.equal(
        (
          await fetch(url, {
            headers: { Authorization: 'Bearer ' + first.token },
          })
        ).status,
        401,
      );
      // Restore this test fixture for subsequent payment scenarios only.
      await db.orm.public.Session.where({ id: first.session.id }).update({
        revokedAt: null,
      });
      assert.equal(
        (await db.orm.public.PaymentAuthorization.where({
          id: c.operationId,
        }).first())!.encryptedCheckoutUrl,
        null,
      );
      await notifyEvent(c, { pending: true, success: false });
      assert.equal((await service.reconcile(c.operationId)).state, 'SUCCEEDED');
      assert.equal(calls.capture, before + 1);
    },
  );
  await t.test(
    'capture ACK is not confirmation; unknown capture retains seats past expiry without replay',
    async () => {
      const c = await ready(),
        before = calls.capture;
      let entered!: () => void, release!: () => void;
      const called = new Promise<void>((r) => (entered = r)),
        waiting = new Promise<void>((r) => (release = r));
      onCapture = async (id, amount) => {
        const saved = (await settlement(c))!;
        assert.equal(saved.status, 'REQUESTED');
        assert.equal(saved.amountPiastres, BigInt(amount));
        assert.equal(saved.transactionId, id);
        assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
        entered();
        await waiting;
        // A successful HTTP acknowledgement with a still-stale inquiry is not paid.
      };
      const pending = service.reconcile(c.operationId);
      await Promise.race([
        called,
        pending.then(() => {
          throw new Error('Capture did not reach gate');
        }),
      ]);
      await expire(c);
      const allocation = (await db.orm.public.BookingSeat.where({
        bookingId: c.booking.id,
      }).first())!;
      assert.equal(allocation.releasedAt, null);
      const availability = await tripDetailsService.listSeats(trip.id);
      assert.equal(
        availability!.seats.find((s) => s.id === allocation.seatId)!
          .isAvailable,
        false,
      );
      const blocked = await fetch(base + '/bookings', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + second.token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId: trip.id,
          contactPhone: '+201012345678',
          passengers: [{ seatId: allocation.seatId, name: 'Other' }],
        }),
      });
      assert.equal(blocked.status, 409);
      release();
      await pending;
      onCapture = undefined;
      assert.equal(
        (await db.orm.public.Ticket.where({ bookingId: c.booking.id }).all())
          .length,
        0,
      );
      assert.equal(
        (
          await fetch(base + '/bookings/' + c.booking.id + '/ticket', {
            headers: { Authorization: 'Bearer ' + first.token },
          })
        ).status,
        404,
      );
      assert.equal((await settlement(c))!.status, 'UNKNOWN');
      assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
      await createPaymentReconciliationService(provider, scope).reconcile(
        c.operationId,
      );
      assert.equal(calls.capture, before + 1);
      remote.get(c.id)!.capturedPiastres = c.booking.totalPiastres;
      await service.reconcile(c.operationId);
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
      assert.equal(calls.capture, before + 1);
    },
  );
  await t.test(
    'timeout after remote capture is resolved by inquiry, with no repeated capture',
    async () => {
      const c = await ready(),
        before = calls.capture;
      onCapture = async (id, amount) => {
        remote.get(id)!.capturedPiastres = amount;
        throw new PaymentProviderError(true);
      };
      await service.reconcile(c.operationId);
      onCapture = undefined;
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
      await service.reconcile(c.operationId);
      assert.equal(calls.capture, before + 1);
    },
  );
  await t.test(
    'authorization arriving after expiry is voided without capturing or reclaiming replacement seats',
    async () => {
      const c = await ready(),
        captureBefore = calls.capture,
        voidBefore = calls.void;
      const seat = (await db.orm.public.BookingSeat.where({
        bookingId: c.booking.id,
      }).first())!;
      await expire(c);
      const replacement = await reserve(second, [seat.seatId]);
      await service.reconcile(c.operationId);
      assert.equal(calls.capture, captureBefore);
      assert.equal(calls.void, voidBefore + 1);
      assert.equal((await settlement(c))!.kind, 'VOID');
      assert.equal((await settlement(c))!.status, 'SUCCEEDED');
      assert.equal((await bookingRow(c))!.status, 'EXPIRED');
      assert.equal(
        (await db.orm.public.BookingSeat.where({
          bookingId: replacement.id,
        }).first())!.releasedAt,
        null,
      );
      await service.reconcile(c.operationId);
      assert.equal(calls.void, voidBefore + 1);
    },
  );
  await t.test(
    'uncertain void is queried on restart rather than sent twice',
    async () => {
      const c = await ready(),
        before = calls.void;
      await expire(c);
      onVoid = async () => {
        throw new PaymentProviderError(true);
      };
      await service.reconcile(c.operationId);
      onVoid = undefined;
      assert.equal((await settlement(c))!.status, 'UNKNOWN');
      await createPaymentReconciliationService(provider, scope).reconcile(
        c.operationId,
      );
      assert.equal(calls.void, before + 1);
      remote.get(c.id)!.voided = true;
      await service.reconcile(c.operationId);
      assert.equal((await settlement(c))!.status, 'SUCCEEDED');
    },
  );
  await t.test(
    'forged or mismatched inquiry data cannot trigger capture or confirmation',
    async () => {
      const c = await ready(),
        before = calls.capture,
        initial = { ...remote.get(c.id)! };
      for (const patch of [
        { ownerId: 1 },
        { integrationId: 1 },
        { orderId: '1' },
        { id: '1' },
        { live: true },
        { currency: 'USD' },
        { amountPiastres: 1 },
      ]) {
        remote.set(c.id, { ...initial, ...patch });
        assert.equal(
          (await service.reconcile(c.operationId)).state,
          'MISMATCH',
        );
        assert.equal(await settlement(c), null);
        assert.equal((await bookingRow(c))!.status, 'PENDING_PAYMENT');
      }
      assert.equal(calls.capture, before);
      remote.set(c.id, initial);
      await service.reconcile(c.operationId);
    },
  );
  await t.test(
    'out-of-order receipts use fresh inquiry; a failed candidate does not hide a valid authorization',
    async () => {
      const c = await ready(false),
        before = calls.capture;
      assert.equal((await service.reconcile(c.operationId)).state, 'WAITING');
      remote.get(c.id)!.pending = true;
      await notifyEvent(c);
      await service.reconcile(c.operationId);
      assert.equal(calls.capture, before);
      remote.get(c.id)!.pending = false;
      const otherId = String(++nextId);
      remote.set(otherId, {
        ...remote.get(c.id)!,
        id: otherId,
        success: false,
      });
      await notifyEvent({ ...c, id: otherId }, { success: false });
      await service.reconcile(c.operationId);
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
      assert.equal(calls.capture, before + 1);
    },
  );
  await t.test(
    'unexpected or partial capture is held for review instead of confirmed or captured again',
    async () => {
      for (const captured of [1, 25000]) {
        const c = await ready(),
          before = calls.capture;
        remote.get(c.id)!.capturedPiastres = captured;
        assert.equal((await service.reconcile(c.operationId)).state, 'REVIEW');
        assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
        assert.equal((await settlement(c))!.status, 'REVIEW');
        await expire(c);
        assert.equal(
          (await db.orm.public.BookingSeat.where({
            bookingId: c.booking.id,
          }).first())!.releasedAt,
          null,
        );
        assert.equal(calls.capture, before);
      }
    },
  );
  await t.test('a suspended owner is voided rather than charged', async () => {
    const c = await ready(),
      before = calls.capture;
    await db.orm.public.User.where({ id: first.user.id }).update({
      isActive: false,
    });
    await service.reconcile(c.operationId);
    assert.equal((await settlement(c))!.kind, 'VOID');
    assert.equal(calls.capture, before);
    assert.equal((await bookingRow(c))!.status, 'EXPIRED');
    await db.orm.public.User.where({ id: first.user.id }).update({
      isActive: true,
    });
  });
  await t.test(
    'a process crash after persisting capture never permits a second POST; verified void releases the hold',
    async () => {
      const c = await ready(),
        before = calls.capture;
      await db.orm.public.Booking.where({ id: c.booking.id }).update({
        status: 'PAYMENT_PROCESSING',
      });
      await db.orm.public.PaymentSettlement.create({
        authorizationId: c.operationId,
        transactionId: c.id,
        kind: 'CAPTURE',
        amountPiastres: BigInt(c.booking.totalPiastres),
      });
      await createPaymentReconciliationService(provider, scope).reconcile(
        c.operationId,
      );
      assert.equal((await settlement(c))!.status, 'UNKNOWN');
      assert.equal(calls.capture, before);
      await expire(c);
      assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
      remote.get(c.id)!.voided = true;
      assert.equal((await service.reconcile(c.operationId)).state, 'REVIEW');
      assert.equal((await bookingRow(c))!.status, 'EXPIRED');
      assert.equal(calls.capture, before);
      assert.ok(
        (await db.orm.public.BookingSeat.where({
          bookingId: c.booking.id,
        }).first())!.releasedAt,
      );
    },
  );
  await t.test(
    'inconsistent captured and pending inquiry flags never confirm a booking',
    async () => {
      const c = await ready(),
        before = calls.capture;
      remote.get(c.id)!.capturedPiastres = c.booking.totalPiastres;
      remote.get(c.id)!.pending = true;
      assert.equal((await service.reconcile(c.operationId)).state, 'REVIEW');
      assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
      assert.equal(calls.capture, before);
    },
  );
  await t.test(
    'review protects a still-pending booking without restoring a seat already released to someone else',
    async () => {
      const c = await ready();
      const oldSeat = (await db.orm.public.BookingSeat.where({
        bookingId: c.booking.id,
      }).first())!;
      await db.orm.public.BookingSeat.where({ id: oldSeat.id }).update({
        releasedAt: new Date().toISOString(),
      });
      const replacement = await reserve(second, [oldSeat.seatId]);
      remote.get(c.id)!.capturedPiastres = c.booking.totalPiastres;
      assert.equal((await service.reconcile(c.operationId)).state, 'REVIEW');
      assert.equal((await bookingRow(c))!.status, 'PAYMENT_PROCESSING');
      assert.ok(
        (await db.orm.public.BookingSeat.where({ id: oldSeat.id }).first())!
          .releasedAt,
      );
      assert.equal(
        (await db.orm.public.BookingSeat.where({
          bookingId: replacement.id,
        }).first())!.releasedAt,
        null,
      );
    },
  );
  await t.test(
    'inquiry outage performs no money operation and the batch reschedules work fairly',
    async () => {
      const c = await ready(),
        before = calls.capture;
      onInquiry = async () => {
        throw new Error('private upstream details');
      };
      assert.equal((await service.reconcile(c.operationId)).state, 'RETRY');
      assert.equal(await settlement(c), null);
      const result = await service.runBatch(100);
      assert.ok(result.retry >= 1);
      assert.equal(calls.capture, before);
      assert.ok(
        Date.parse(
          (await db.orm.public.PaymentAuthorization.where({
            id: c.operationId,
          }).first())!.nextReconcileAt,
        ) > Date.now(),
      );
      onInquiry = undefined;
      await service.reconcile(c.operationId);
    },
  );
  // Additional recovery fixtures use the real booking service directly; HTTP
  // booking behavior stays covered above without exhausting its production limiter.
  serviceFixtures = true;
  async function forgetOrder(
    c: Context,
    status: 'UNKNOWN' | 'REQUESTING' = 'UNKNOWN',
  ) {
    await db.orm.public.PaymentAuthorization.where({
      id: c.operationId,
    }).update({
      status,
      intentionId: null,
      orderId: null,
      encryptedCheckoutUrl: null,
    });
  }
  function recovery(c: Context, patch: Record<string, unknown> = {}) {
    return createPaymentReconciliationService(
      {
        ...provider,
        async getTransactionByReference(reference: string) {
          assert.equal(reference, c.operationId);
          return { ...remote.get(c.id)!, reference, ...patch };
        },
      },
      scope,
    );
  }
  await t.test(
    'missing-order recovery races safely, captures once without callback, and never reconstructs checkout',
    async () => {
      const c = await ready(false, true),
        before = calls.capture;
      let resends = 0;
      const repeated = await createPaymentAuthorizationService({
        provider: {
          async createAuthorization() {
            resends++;
            throw new Error('Must not resend');
          },
        },
        ...scope,
        encryptionKey: Buffer.alloc(32, 7),
      }).start(first.auth, c.booking.id);
      assert.equal(repeated.status, 'UNKNOWN');
      assert.equal(resends, 0);
      await Promise.all(
        Array.from({ length: 6 }, () => recovery(c).reconcile(c.operationId)),
      );
      assert.equal(calls.capture, before + 1);
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
      const operation = (await db.orm.public.PaymentAuthorization.where({
        id: c.operationId,
      }).first())!;
      assert.equal(operation.orderId, c.orderId);
      assert.equal(operation.intentionId, null);
      assert.equal(operation.encryptedCheckoutUrl, null);
      assert.equal((await settlement(c))!.transactionId, c.id);
    },
  );
  await t.test(
    'fresh creation waits; stale REQUESTING is recovered by the existing worker batch',
    async () => {
      const c = await ready(false),
        before = calls.capture;
      await forgetOrder(c, 'REQUESTING');
      let queried = 0;
      const worker = createPaymentReconciliationService(
        {
          ...provider,
          async getTransactionByReference(reference: string) {
            queried++;
            assert.equal(reference, c.operationId);
            return { ...remote.get(c.id)!, reference };
          },
        },
        scope,
      );
      assert.equal((await worker.reconcile(c.operationId)).state, 'WAITING');
      assert.equal(queried, 0);
      // Isolate this due row from other fixture operations for the bounded batch.
      await db.orm.public.PaymentAuthorization.where({
        reconciliationComplete: false,
      }).updateAll({
        nextReconcileAt: new Date(Date.now() + 60000).toISOString(),
      });
      await db.orm.public.PaymentAuthorization.where({
        id: c.operationId,
      }).update({
        createdAt: new Date(Date.now() - 60000).toISOString(),
        nextReconcileAt: new Date(Date.now() - 1000).toISOString(),
      });
      const counts = await worker.runBatch(1);
      assert.equal(counts.checked, 1);
      assert.equal(counts.failed, 0);
      assert.equal(calls.capture, before + 1);
      assert.equal((await bookingRow(c))!.status, 'CONFIRMED');
    },
  );
  await t.test(
    'wrong reference, amount or scope never persists a recovered order; unavailable inquiry never resends creation',
    async () => {
      const c = await ready(false),
        before = calls.capture;
      await forgetOrder(c);
      for (const patch of [
        { reference: randomUUID() },
        { ownerId: 9 },
        { integrationId: 9 },
        { amountPiastres: 1 },
        { live: true },
        { currency: 'USD' },
      ]) {
        assert.equal(
          (await recovery(c, patch).reconcile(c.operationId)).state,
          'MISMATCH',
        );
        assert.equal(
          (await db.orm.public.PaymentAuthorization.where({
            id: c.operationId,
          }).first())!.orderId,
          null,
        );
      }
      const offline = createPaymentReconciliationService(
        {
          ...provider,
          async getTransactionByReference() {
            throw new Error('private provider failure');
          },
        },
        scope,
      );
      assert.equal((await offline.reconcile(c.operationId)).state, 'RETRY');
      assert.equal(calls.capture, before);
      assert.equal(await settlement(c), null);
      await recovery(c).reconcile(c.operationId);
    },
  );
  await t.test(
    'expired missing-order recovery voids authorization without taking the replacement seat',
    async () => {
      const c = await ready(false),
        beforeCapture = calls.capture,
        beforeVoid = calls.void;
      await forgetOrder(c);
      await expire(c);
      const seat = (await db.orm.public.BookingSeat.where({
        bookingId: c.booking.id,
      }).first())!;
      const replacement = await reserve(second, [seat.seatId]);
      assert.equal(
        (await recovery(c).reconcile(c.operationId)).state,
        'SUCCEEDED',
      );
      assert.equal(calls.capture, beforeCapture);
      assert.equal(calls.void, beforeVoid + 1);
      assert.equal((await bookingRow(c))!.status, 'EXPIRED');
      assert.equal(
        (await db.orm.public.BookingSeat.where({
          bookingId: replacement.id,
        }).first())!.releasedAt,
        null,
      );
    },
  );
  await t.test(
    'known-order callback fallback accepts only its own original authorization, never a child or different order',
    async () => {
      const c = await ready(false),
        before = calls.capture;
      assert.equal(
        (await recovery(c, { orderId: '99999999' }).reconcile(c.operationId))
          .state,
        'MISMATCH',
      );
      assert.equal(
        (
          await recovery(c, { authorization: false, capture: true }).reconcile(
            c.operationId,
          )
        ).state,
        'WAITING',
      );
      assert.equal(calls.capture, before);
      assert.equal(
        (await recovery(c).reconcile(c.operationId)).state,
        'SUCCEEDED',
      );
      assert.equal(calls.capture, before + 1);
    },
  );
  await t.test(
    'ticket delivery stops after five failures; unsafe or departed bookings are not mailed',
    async () => {
      const pending = await db.orm.public.Ticket.where({
        sentAt: null,
        discardedAt: null,
      }).all();
      assert.ok(pending.length >= 3);
      const exhausted = pending[0]!,
        departed = pending[1]!,
        unsafe = pending[2]!;
      // Isolate this outbox batch from other confirmed fixtures.
      await db.orm.public.Ticket.where({ sentAt: null }).updateAll({
        nextAttemptAt: '2100-01-01T00:00:00Z',
      });
      await db.orm.public.Ticket.where({ id: exhausted.id }).update({
        attempts: 4,
        nextAttemptAt: new Date(0).toISOString(),
      });
      assert.deepEqual(
        await processTicketOutbox(async () => {
          throw new Error('SMTP unavailable');
        }),
        { sent: 0, failed: 1, discarded: 0 },
      );
      const failed = (await db.orm.public.Ticket.where({
        id: exhausted.id,
      }).first())!;
      assert.equal(failed.attempts, 5);
      assert.ok(failed.discardedAt);
      let calls = 0;
      await processTicketOutbox(async () => {
        calls++;
      });
      assert.equal(calls, 0);
      const departedBooking = (await db.orm.public.Booking.where({
        id: departed.bookingId,
      }).first())!;
      const originalTrip = (await db.orm.public.Trip.where({
        id: departedBooking.tripId,
      }).first())!;
      await db.orm.public.Trip.where({ id: originalTrip.id }).update({
        departureAt: '2020-01-01T08:00:00Z',
        arrivalAt: '2020-01-01T11:00:00Z',
      });
      await db.orm.public.Ticket.where({ id: departed.id }).update({
        nextAttemptAt: new Date(0).toISOString(),
      });
      assert.equal(
        (
          await processTicketOutbox(async () => {
            calls++;
          })
        ).discarded,
        1,
      );
      await db.orm.public.Trip.where({ id: originalTrip.id }).update({
        departureAt: originalTrip.departureAt,
        arrivalAt: originalTrip.arrivalAt,
      });
      const unsafeBooking = (await db.orm.public.Booking.where({
        id: unsafe.bookingId,
      }).first())!;
      await db.orm.public.User.where({ id: unsafeBooking.userId }).update({
        isActive: false,
      });
      await db.orm.public.Ticket.where({ id: unsafe.id }).update({
        nextAttemptAt: new Date(0).toISOString(),
      });
      assert.equal(
        (
          await processTicketOutbox(async () => {
            calls++;
          })
        ).discarded,
        1,
      );
      await db.orm.public.User.where({ id: unsafeBooking.userId }).update({
        isActive: true,
      });
      assert.equal(calls, 0);
      const attempt = (await db.orm.public.PaymentAttempt.where({
        bookingId: unsafe.bookingId,
      }).first())!;
      const op = (await db.orm.public.PaymentAuthorization.where({
        paymentAttemptId: attempt.id,
      }).first())!;
      await db.orm.public.PaymentSettlement.where({
        authorizationId: op.id,
      }).update({ status: 'REVIEW' });
      assert.equal(
        (
          await fetch(base + '/bookings/' + unsafe.bookingId + '/ticket', {
            headers: { Authorization: 'Bearer ' + first.token },
          })
        ).status,
        404,
      );
    },
  );
});
