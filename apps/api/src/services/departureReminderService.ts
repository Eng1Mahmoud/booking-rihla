import {
  sendDepartureReminderMail,
  type SendDepartureReminderMail,
} from './mailService.ts';
import { ticketRecords, serializeTicketDetails } from './ticketService.ts';

export const reminderLeadMs = 24 * 60 * 60 * 1000;
// 24 elapsed hours; independent of local calendar days and daylight saving changes.
export function departureReminderState(
  issuedAt: string,
  departureAt: string,
  now: number,
) {
  const departure = Date.parse(departureAt),
    issued = Date.parse(issuedAt);
  if (
    !Number.isFinite(departure) ||
    !Number.isFinite(issued) ||
    !Number.isFinite(now)
  )
    throw new Error('Invalid reminder timestamp');
  if (departure <= now || issued > departure - reminderLeadMs) return 'SKIP';
  return departure - now <= reminderLeadMs ? 'DUE' : 'WAITING';
}

export async function processDepartureReminders(
  send: SendDepartureReminderMail = sendDepartureReminderMail,
  clock: () => number = Date.now,
) {
  const { db } = await import('../prisma/db.ts');
  const now = clock();
  const pending = await db.orm.public.Ticket.where({
    reminderSentAt: null,
    reminderDiscardedAt: null,
  })
    .where((ticket) =>
      ticket.reminderNextAttemptAt.lte(new Date(now).toISOString()),
    )
    .where((ticket) =>
      ticket.booking.some((booking) =>
        booking.trip.some((trip) =>
          trip.departureAt.lte(new Date(now + reminderLeadMs).toISOString()),
        ),
      ),
    )
    .orderBy([
      (ticket) => ticket.reminderNextAttemptAt.asc(),
      (ticket) => ticket.id.asc(),
    ])
    .limit(20)
    .all();
  const counts = { sent: 0, failed: 0, discarded: 0 };
  for (const candidate of pending) {
    const outcome = await db.transaction(async (tx) => {
      // Same Ticket lock as ticket delivery. Re-read after waiting for another worker.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Ticket" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const message = await tx.orm.public.Ticket.where({
        id: candidate.id,
      }).first();
      const current = clock();
      if (
        !message ||
        message.reminderSentAt ||
        message.reminderDiscardedAt ||
        Date.parse(message.reminderNextAttemptAt) > current
      )
        return null;
      const booking = await ticketRecords(tx)
        .where({ id: message.bookingId })
        .first();
      const user = booking
        ? await tx.orm.public.User.where({ id: booking.userId }).first()
        : null;
      const ticket = booking ? serializeTicketDetails(booking) : null;
      const state = ticket
        ? departureReminderState(
            ticket.issuedAt,
            ticket.trip.departureAt,
            current,
          )
        : 'SKIP';
      if (state === 'WAITING') return null;
      if (
        !ticket ||
        !user?.isActive ||
        !user.emailVerifiedAt ||
        message.reminderAttempts >= 5 ||
        state === 'SKIP'
      ) {
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          reminderDiscardedAt: new Date(current).toISOString(),
        });
        return 'discarded' as const;
      }
      try {
        await send({ email: user.email, language: user.language, ticket });
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          reminderSentAt: new Date(clock()).toISOString(),
          reminderAttempts: message.reminderAttempts + 1,
        });
        return 'sent' as const;
      } catch {
        const attempts = message.reminderAttempts + 1;
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          reminderAttempts: attempts,
          reminderNextAttemptAt: new Date(
            clock() + Math.min(900000, 30000 * 2 ** (attempts - 1)),
          ).toISOString(),
          ...(attempts >= 5
            ? { reminderDiscardedAt: new Date(clock()).toISOString() }
            : {}),
        });
        return 'failed' as const;
      }
    });
    if (outcome) counts[outcome]++;
  }
  return counts;
}
