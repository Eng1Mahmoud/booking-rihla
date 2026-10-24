import { processMailBatch } from './mailDeliveryService.ts';
import { sendBookingNotice, type SendBookingNotice } from './mailService.ts';
export async function processBookingNotices(
  send: SendBookingNotice = sendBookingNotice,
) {
  const { db } = await import('../prisma/db.ts');
  const candidates = await db.orm.public.BookingNotice.where({
    sentAt: null,
    discardedAt: null,
  })
    .where((n) => n.nextAttemptAt.lte(new Date().toISOString()))
    .orderBy((n) => n.nextAttemptAt.asc())
    .limit(20)
    .all();
  return processMailBatch(
    db,
    candidates,
    'notice',
    async ({ message: notice, exhausted }) => {
      const b = notice.booking,
        user = b?.user;
      if (
        !b ||
        !user?.emailVerifiedAt ||
        (notice.purpose === 'TRIP_CANCELLED' &&
          b.trip?.status !== 'CANCELLED') ||
        exhausted ||
        (notice.purpose === 'REFUND_SUCCEEDED' &&
          b.refund?.status !== 'SUCCEEDED')
      ) {
        return 'discarded' as const;
      }
      return async () => {
        // Financial notices must reach verified owners even if their account is suspended.
        await send({
          id: notice.id,
          email: user.email,
          language: user.language,
          reference: b.reference,
          purpose: notice.purpose,
          amountPiastres: b.refund?.amountPiastres.toString() ?? null,
        });
      };
    },
  );
}
