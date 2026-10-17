import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { db } from '../../src/prisma/db.ts';
import { seedDemo } from '../../src/scripts/demoSeed.ts';
import { buildDemoData } from '../../src/scripts/demoData.ts';
import { bookingService } from '../../src/services/bookingService.ts';
import { paymentAttemptService } from '../../src/services/paymentAttemptService.ts';
import {
  processDepartureReminders,
  reminderLeadMs,
} from '../../src/services/departureReminderService.ts';
import { ticketService } from '../../src/services/ticketService.ts';
import type { AuthContext } from '../../src/services/sessionService.ts';

test('departure reminders persist delivery state, revalidate paid bookings and serialize workers', async (t) => {
  const namespace = 'reminders-' + randomUUID(),
    data = buildDemoData('2099-01-01', namespace);
  const userId = randomUUID();
  t.after(async () => {
    try {
      for (const trip of data.trips) {
        for (const booking of await db.orm.public.Booking.where({
          tripId: trip.id,
        }).all()) {
          const attempt = await db.orm.public.PaymentAttempt.where({
            bookingId: booking.id,
          }).first();
          if (attempt) {
            const op = await db.orm.public.PaymentAuthorization.where({
              paymentAttemptId: attempt.id,
            }).first();
            if (op) {
              await db.orm.public.PaymentSettlement.where({
                authorizationId: op.id,
              }).deleteAll();
              await db.orm.public.PaymentAuthorization.where({
                id: op.id,
              }).delete();
            }
            await db.orm.public.PaymentAttempt.where({
              id: attempt.id,
            }).delete();
          }
        }
        await db.orm.public.Booking.where({ tripId: trip.id }).deleteAll();
        await db.orm.public.Trip.where({ id: trip.id }).delete();
      }
      await db.orm.public.User.where({ id: userId }).delete();
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
  await seedDemo('2099-01-01', namespace);
  const user = await db.orm.public.User.create({
    id: userId,
    name: 'Reminder passenger',
    email: randomUUID() + '@example.test',
    phone: '+201012345678',
    passwordHash: 'private-hash',
    emailVerifiedAt: new Date().toISOString(),
    language: 'ar',
  });
  const session = await db.orm.public.Session.create({
    userId: user.id,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  const auth: AuthContext = { user, sessionId: session.id };
  const trip = data.trips[0]!,
    departure = Date.parse(trip.departureAt),
    due = departure - reminderLeadMs;
  const seats = data.seats.filter((s) => s.busId === trip.busId);
  let nextSeat = 0,
    nextProvider = 980000;
  // These are controlled delivery fixtures, not assertions of a real provider payment.
  async function paid(issuedAt = new Date(due - 3600000).toISOString()) {
    const booking = await bookingService.create(auth, {
      tripId: trip.id,
      contactPhone: '+201012345678',
      passengers: [{ seatId: seats[nextSeat++]!.id, name: '<Passenger>' }],
    });
    const attempt = (
      await paymentAttemptService.prepare(auth, booking.id, randomUUID())
    ).data;
    const op = await db.orm.public.PaymentAuthorization.create({
      paymentAttemptId: attempt.id,
      status: 'EXPIRED',
      integrationId: '6741',
      ownerId: '4705',
      reconciliationComplete: true,
    });
    const settlement = await db.orm.public.PaymentSettlement.create({
      authorizationId: op.id,
      transactionId: String(++nextProvider),
      kind: 'CAPTURE',
      status: 'SUCCEEDED',
      amountPiastres: BigInt(booking.totalPiastres),
    });
    await db.orm.public.Booking.where({ id: booking.id }).update({
      status: 'CONFIRMED',
    });
    const ticket = await db.orm.public.Ticket.create({
      bookingId: booking.id,
      createdAt: issuedAt,
    });
    return { booking, attempt, op, settlement, ticket };
  }
  const counts = (sent = 0, failed = 0, discarded = 0) => ({
    sent,
    failed,
    discarded,
  });
  let sends = 0;
  const send = async () => {
    sends++;
  };
  await t.test(
    'nothing early; exact threshold sends once across concurrent and restarted workers without altering payment or ticket delivery',
    async () => {
      const c = await paid(new Date(due).toISOString());
      const before = await ticketService.findByBooking(user.id, c.booking.id);
      assert.ok(before);
      assert.deepEqual(
        await processDepartureReminders(send, () => due - 1),
        counts(),
      );
      assert.equal(sends, 0);
      const rows = await Promise.all(
        Array.from({ length: 4 }, () =>
          processDepartureReminders(
            async (message) => {
              sends++;
              assert.equal(message.email, user.email);
              assert.equal(message.language, 'ar');
              assert.equal(message.ticket.id, c.ticket.id);
              for (const key of [
                'qr',
                'contactPhone',
                'orderId',
                'encryptedCheckoutUrl',
                'passwordHash',
              ])
                assert.equal(key in message.ticket, false);
            },
            () => due,
          ),
        ),
      );
      assert.equal(
        rows.reduce((sum, row) => sum + row.sent, 0),
        1,
      );
      assert.equal(sends, 1);
      const row = (await db.orm.public.Ticket.where({
        id: c.ticket.id,
      }).first())!;
      assert.equal(Date.parse(row.reminderSentAt!), due);
      assert.equal(row.reminderAttempts, 1);
      assert.equal(row.sentAt, null);
      assert.equal(row.attempts, 0);
      assert.deepEqual(
        await ticketService.findByBooking(user.id, c.booking.id),
        before,
      );
      assert.equal(
        (await db.orm.public.Booking.where({ id: c.booking.id }).first())!
          .status,
        'CONFIRMED',
      );
      assert.equal(
        (await db.orm.public.PaymentSettlement.where({
          id: c.settlement.id,
        }).first())!.status,
        'SUCCEEDED',
      );
      assert.deepEqual(
        await processDepartureReminders(send, () => due + 1000),
        counts(),
      );
      assert.equal(sends, 1);
    },
  );
  await t.test(
    'ticket issued inside the window skips a redundant reminder',
    async () => {
      const c = await paid(new Date(due + 1).toISOString());
      assert.deepEqual(
        await processDepartureReminders(send, () => due + 1000),
        counts(0, 0, 1),
      );
      assert.ok(
        (await db.orm.public.Ticket.where({ id: c.ticket.id }).first())!
          .reminderDiscardedAt,
      );
    },
  );
  await t.test(
    'failed SMTP is delayed and retried once when due, with the same ticket',
    async () => {
      const c = await paid();
      assert.deepEqual(
        await processDepartureReminders(
          async () => {
            throw new Error('private SMTP response');
          },
          () => due,
        ),
        counts(0, 1),
      );
      const row = (await db.orm.public.Ticket.where({
        id: c.ticket.id,
      }).first())!;
      assert.equal(row.reminderAttempts, 1);
      assert.equal(Date.parse(row.reminderNextAttemptAt), due + 30000);
      assert.equal(row.reminderSentAt, null);
      assert.deepEqual(
        await processDepartureReminders(send, () => due + 29999),
        counts(),
      );
      assert.deepEqual(
        await processDepartureReminders(
          async (message) => {
            assert.equal(message.ticket.id, c.ticket.id);
          },
          () => due + 30000,
        ),
        counts(1),
      );
      assert.equal(
        (await db.orm.public.Ticket.where({ id: c.ticket.id }).first())!
          .reminderAttempts,
        2,
      );
    },
  );
  await t.test(
    'fifth failure is terminal and cannot block the next due ticket',
    async () => {
      const c = await paid();
      await db.orm.public.Ticket.where({ id: c.ticket.id }).update({
        reminderAttempts: 4,
      });
      assert.deepEqual(
        await processDepartureReminders(
          async () => {
            throw new Error('SMTP unavailable');
          },
          () => due,
        ),
        counts(0, 1),
      );
      const row = (await db.orm.public.Ticket.where({
        id: c.ticket.id,
      }).first())!;
      assert.equal(row.reminderAttempts, 5);
      assert.ok(row.reminderDiscardedAt);
      await paid();
      assert.deepEqual(
        await processDepartureReminders(send, () => due + 1000000),
        counts(1),
      );
    },
  );
  await t.test(
    'catch-up sends before departure; departed journeys are discarded',
    async () => {
      await paid();
      assert.deepEqual(
        await processDepartureReminders(send, () => departure - 3600000),
        counts(1),
      );
      const c = await paid();
      assert.deepEqual(
        await processDepartureReminders(send, () => departure),
        counts(0, 0, 1),
      );
      assert.ok(
        (await db.orm.public.Ticket.where({ id: c.ticket.id }).first())!
          .reminderDiscardedAt,
      );
    },
  );
  await t.test(
    'departure crossing between selection and processing prevents mail',
    async () => {
      await paid();
      let reads = 0;
      assert.deepEqual(
        await processDepartureReminders(send, () =>
          ++reads === 1 ? due : departure,
        ),
        counts(0, 0, 1),
      );
    },
  );
  await t.test(
    'cancelled trips, unresolved payments, missing allocations and inactive/unverified recipients never send',
    async () => {
      const before = sends;
      const cancelled = await paid();
      await db.orm.public.Trip.where({ id: trip.id }).update({
        status: 'CANCELLED',
      });
      assert.deepEqual(
        await processDepartureReminders(send, () => due),
        counts(0, 0, 1),
      );
      await db.orm.public.Trip.where({ id: trip.id }).update({
        status: 'SCHEDULED',
      });
      assert.ok(
        (await db.orm.public.Ticket.where({ id: cancelled.ticket.id }).first())!
          .reminderDiscardedAt,
      );
      for (const status of ['UNKNOWN', 'REVIEW'] as const) {
        const c = await paid();
        await db.orm.public.PaymentSettlement.where({
          id: c.settlement.id,
        }).update({ status });
        assert.deepEqual(
          await processDepartureReminders(send, () => due),
          counts(0, 0, 1),
        );
      }
      const allocation = await paid();
      await db.orm.public.BookingSeat.where({
        bookingId: allocation.booking.id,
      }).updateAll({ releasedAt: new Date().toISOString() });
      assert.deepEqual(
        await processDepartureReminders(send, () => due),
        counts(0, 0, 1),
      );
      await paid();
      await db.orm.public.User.where({ id: user.id }).update({
        isActive: false,
      });
      assert.deepEqual(
        await processDepartureReminders(send, () => due),
        counts(0, 0, 1),
      );
      await db.orm.public.User.where({ id: user.id }).update({
        isActive: true,
      });
      await paid();
      await db.orm.public.User.where({ id: user.id }).update({
        emailVerifiedAt: null,
      });
      assert.deepEqual(
        await processDepartureReminders(send, () => due),
        counts(0, 0, 1),
      );
      await db.orm.public.User.where({ id: user.id }).update({
        emailVerifiedAt: user.emailVerifiedAt,
      });
      assert.equal(sends, before);
    },
  );
});
