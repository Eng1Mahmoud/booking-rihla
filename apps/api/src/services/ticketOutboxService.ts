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
  const counts = { sent: 0, failed: 0, discarded: 0 };
  for (const candidate of pending) {
    const outcome = await db.transaction(async (tx) => {
      // Serializes workers. Delivery is at least once if SMTP succeeds before a crash.
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Ticket" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const message = await tx.orm.public.Ticket.where({
        id: candidate.id,
      }).first();
      if (
        !message ||
        message.sentAt ||
        message.discardedAt ||
        Date.parse(message.nextAttemptAt) > Date.now()
      )
        return null;
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
        message.attempts >= 5 ||
        Date.parse(ticket.trip.departureAt) <= Date.now()
      ) {
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          discardedAt: new Date().toISOString(),
        });
        return 'discarded' as const;
      }
      try {
        await send({ email: user.email, language: user.language, ticket });
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          sentAt: new Date().toISOString(),
          attempts: message.attempts + 1,
        });
        return 'sent' as const;
      } catch {
        const attempts = message.attempts + 1;
        await tx.orm.public.Ticket.where({ id: message.id }).update({
          attempts,
          nextAttemptAt: new Date(
            Date.now() + Math.min(900000, 30000 * 2 ** (attempts - 1)),
          ).toISOString(),
          ...(attempts >= 5 ? { discardedAt: new Date().toISOString() } : {}),
        });
        return 'failed' as const;
      }
    });
    if (outcome) counts[outcome]++;
  }
  return counts;
}
