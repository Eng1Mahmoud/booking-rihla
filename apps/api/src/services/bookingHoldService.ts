import type { db as database } from '../prisma/db.ts';
type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
export const holdDurationMs = 10 * 60 * 1000;
export function bookingState(
  booking: {
    status: 'RESERVED' | 'PENDING_PAYMENT' | 'EXPIRED';
    expiresAt: string | null;
  },
  now = Date.now(),
) {
  return booking.status === 'PENDING_PAYMENT' &&
    booking.expiresAt &&
    Date.parse(booking.expiresAt) <= now
    ? 'EXPIRED'
    : booking.status;
}
// Caller must hold the Trip row FOR UPDATE; creation, expiry and future payment confirmation share it.
export async function expireTripHolds(
  tx: Transaction,
  db: typeof database,
  tripId: string,
  now: string,
) {
  await tx.execute(
    db.raw
      .sql`UPDATE "public"."BookingSeat" s SET "releasedAt" = ${now}::timestamptz FROM "public"."Booking" b WHERE s."bookingId" = b."id" AND b."tripId" = ${tripId} AND b."status" = 'PENDING_PAYMENT' AND b."expiresAt" <= ${now}::timestamptz AND s."releasedAt" IS NULL`
      .affectedCount()
      .build(),
  );
  await tx.orm.public.Booking.where({ tripId, status: 'PENDING_PAYMENT' })
    .where((b) => b.expiresAt.lte(now))
    .updateAll({ status: 'EXPIRED' });
}
export async function expireBookingHolds(limit = 100) {
  const { db } = await import('../prisma/db.ts');
  const candidates = await db.orm.public.Booking.where({
    status: 'PENDING_PAYMENT',
  })
    .where((b) => b.expiresAt.lte(new Date().toISOString()))
    .select('tripId')
    .orderBy((b) => b.expiresAt.asc())
    .limit(limit)
    .all();
  const trips = [...new Set(candidates.map((b) => b.tripId))].sort();
  for (const tripId of trips)
    await db.transaction(async (tx) => {
      await tx.execute(
        db.raw
          .sql`SELECT "id" FROM "public"."Trip" WHERE "id" = ${tripId} FOR UPDATE`
          .affectedCount()
          .build(),
      );
      await expireTripHolds(tx, db, tripId, new Date().toISOString());
    });
  return { processedTrips: trips.length };
}
