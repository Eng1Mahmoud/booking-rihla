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
  const result = { sent: 0, failed: 0, discarded: 0 };
  for (const candidate of candidates) {
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."BookingNotice" WHERE "id" = ${candidate.id} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      const notice = await tx.orm.public.BookingNotice.where({
        id: candidate.id,
      })
        .include('booking', (b) =>
          b.include('user').include('trip').include('refund'),
        )
        .first();
      if (
        !notice ||
        notice.sentAt ||
        notice.discardedAt ||
        Date.parse(notice.nextAttemptAt) > Date.now()
      )
        return null;
      const b = notice.booking,
        user = b?.user;
      if (
        !b ||
        !user?.emailVerifiedAt ||
        (notice.purpose === 'TRIP_CANCELLED' &&
          b.trip?.status !== 'CANCELLED') ||
        notice.attempts >= 5 ||
        (notice.purpose === 'REFUND_SUCCEEDED' &&
          b.refund?.status !== 'SUCCEEDED')
      ) {
        await tx.orm.public.BookingNotice.where({ id: notice.id }).update({
          discardedAt: new Date().toISOString(),
        });
        return 'discarded' as const;
      }
      try {
        // Financial notices must reach verified owners even if their account is suspended.
        await send({
          id: notice.id,
          email: user.email,
          language: user.language,
          reference: b.reference,
          purpose: notice.purpose,
          amountPiastres: b.refund?.amountPiastres.toString() ?? null,
        });
        await tx.orm.public.BookingNotice.where({ id: notice.id }).update({
          sentAt: new Date().toISOString(),
          attempts: notice.attempts + 1,
        });
        return 'sent' as const;
      } catch {
        const attempts = notice.attempts + 1;
        await tx.orm.public.BookingNotice.where({ id: notice.id }).update({
          attempts,
          nextAttemptAt: new Date(
            Date.now() + Math.min(900000, 30000 * 2 ** (attempts - 1)),
          ).toISOString(),
          ...(attempts >= 5 ? { discardedAt: new Date().toISOString() } : {}),
        });
        return 'failed' as const;
      }
    });
    if (outcome) result[outcome]++;
  }
  return result;
}
