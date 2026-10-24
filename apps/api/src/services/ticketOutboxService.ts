import { processMailBatch } from './mailDeliveryService.ts';
import { sendTicketMail, type SendTicketMail } from './mailService.ts';
import { ticketRecords, serializeTicket } from './ticketService.ts';

export async function processTicketOutbox(
  send: SendTicketMail = sendTicketMail,
) {
  const { db } = await import('../prisma/db.ts');
  const pending = await db.orm.public.Ticket.where({
    sentAt: null,
    discardedAt: null,
  })
    .where((ticket) => ticket.nextAttemptAt.lte(new Date().toISOString()))
    .orderBy((ticket) => ticket.nextAttemptAt.asc())
    .limit(20)
    .all();
  return processMailBatch(
    db,
    pending,
    'ticket',
    async ({ tx, message, exhausted }) => {
      const booking = await ticketRecords(tx)
        .where({ id: message.bookingId })
        .first();
      const user = booking
        ? await tx.orm.public.User.where({ id: booking.userId }).first()
        : null;
      const ticket = booking ? await serializeTicket(booking) : null;
      if (
        !ticket ||
        !user?.isActive ||
        !user.emailVerifiedAt ||
        exhausted ||
        Date.parse(ticket.trip.departureAt) <= Date.now()
      ) {
        return 'discarded' as const;
      }
      return async () => {
        await send({ email: user.email, language: user.language, ticket });
      };
    },
  );
}
