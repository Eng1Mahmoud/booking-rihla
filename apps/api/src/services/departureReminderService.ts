import { processMailBatch } from './mailDeliveryService.ts';
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
  return processMailBatch(
    db,
    pending,
    'reminder',
    async ({ tx, message, exhausted, current }) => {
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
            current!,
          )
        : 'SKIP';
      if (state === 'WAITING') return null;
      if (
        !ticket ||
        !user?.isActive ||
        !user.emailVerifiedAt ||
        exhausted ||
        state === 'SKIP'
      ) {
        return 'discarded' as const;
      }
      return async () => {
        await send({ email: user.email, language: user.language, ticket });
      };
    },
    clock,
  );
}
