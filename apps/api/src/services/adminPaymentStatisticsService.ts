import {
  paymentStatisticsCountsSchema,
  type AdminPaymentStatisticsQuery,
} from '../schemas/adminPaymentStatisticsSchema.ts';
import { cairoDayBounds, cairoTimeZone } from '../utils/cairoTime.ts';

// Aggregate money can exceed JavaScript's safe integer range. Keep it exact.
export function formatPiastresAsEGP(piastres: string) {
  const amount = BigInt(piastres);
  if (amount < 0n) throw new Error('Invalid paid amount');
  return (
    (amount / 100n).toString() +
    '.' +
    (amount % 100n).toString().padStart(2, '0')
  );
}

export const adminPaymentStatisticsService = {
  async get({ date }: AdminPaymentStatisticsQuery) {
    const { start, end } = cairoDayBounds(date);
    const { db } = await import('../prisma/db.ts');
    const serverTime = new Date().toISOString();
    // A single statement keeps counts and money in the same snapshot.
    // updatedAt records when this application last persisted a settlement
    // outcome; it is not the provider's transaction or bank payout timestamp.
    const rows = await db.runtime().query(
      db.raw.sql`
        WITH scoped AS (
          SELECT s."kind", s."status", s."amountPiastres",
            a."reconciliationComplete", b."status" AS "bookingStatus",
            b."expiresAt" AS "bookingExpiresAt",
            (p."currency" = 'EGP'
              AND p."amountPiastres" = b."totalPiastres"
              AND p."expiresAt" = b."expiresAt"
              AND s."amountPiastres" = b."totalPiastres") AS matches
          FROM "public"."PaymentSettlement" s
          JOIN "public"."PaymentSession" a ON a."id" = s."paymentSessionId"
          JOIN "public"."PaymentAttempt" p ON p."id" = a."paymentAttemptId"
          JOIN "public"."Booking" b ON b."id" = p."bookingId"
          WHERE s."updatedAt" >= ${start}::timestamptz
            AND s."updatedAt" < ${end}::timestamptz
        ), classified AS (
          SELECT "amountPiastres",
            CASE
              WHEN "status" = 'REVIEW' OR matches IS NOT TRUE THEN 'REVIEW'
              WHEN "status" = 'SUCCEEDED' AND "kind" = 'SALE'
                AND "bookingStatus" = 'CONFIRMED' AND "reconciliationComplete"
                THEN 'PAID'
              WHEN "status" = 'SUCCEEDED' AND "kind" = 'SALE'
                AND "bookingStatus" = 'EXPIRED' AND "reconciliationComplete"
                THEN 'REFUND_REQUIRED'
              WHEN "status" = 'REQUESTED' THEN 'REQUESTED'
              WHEN "status" = 'UNKNOWN' THEN 'UNKNOWN'
              ELSE 'REVIEW'
            END AS state
          FROM scoped
        )
        SELECT json_build_object(
          'total', count(*),
          'paid', count(*) FILTER (WHERE state = 'PAID'),
          'refundRequired', count(*) FILTER (WHERE state = 'REFUND_REQUIRED'),
          'requested', count(*) FILTER (WHERE state = 'REQUESTED'),
          'unknown', count(*) FILTER (WHERE state = 'UNKNOWN'),
          'requiresReview', count(*) FILTER (WHERE state = 'REVIEW'),
          'paidPiastres', coalesce(sum("amountPiastres") FILTER (WHERE state = 'PAID'), 0)::text
        )::text AS data
        FROM classified
      `
        .returnsRow({ data: 'pg/text@1' })
        .build(),
    );
    if (!rows[0]) throw new Error('Payment statistics aggregate is missing');
    const { paidPiastres, ...settlements } =
      paymentStatisticsCountsSchema.parse(JSON.parse(rows[0].data));
    return {
      date,
      timeZone: cairoTimeZone,
      start,
      end,
      serverTime,
      dateBasis: 'SETTLEMENT_LAST_UPDATED_AT' as const,
      currency: 'EGP' as const,
      settlements,
      paid: {
        amountPiastres: paidPiastres,
        amountEGP: formatPiastresAsEGP(paidPiastres),
      },
    };
  },
};
export type AdminPaymentStatisticsService =
  typeof adminPaymentStatisticsService;
