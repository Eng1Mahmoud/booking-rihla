import type { AdminStatisticsQuery } from '../schemas/adminStatisticsSchema.ts';
import { statisticsCountsSchema } from '../schemas/adminStatisticsSchema.ts';
import { cairoDayBounds, cairoTimeZone } from '../utils/cairoTime.ts';
export const adminStatisticsService = {
  async get({ travelDate }: AdminStatisticsQuery) {
    const { start, end } = cairoDayBounds(travelDate);
    const { db } = await import('../prisma/db.ts');
    const serverTime = new Date().toISOString();
    // One statement gives every aggregate the same PostgreSQL snapshot.
    // Bind values through Prisma; no user input becomes SQL syntax.
    const rows = await db.runtime().query(
      db.raw.sql`
        WITH trips AS (
          SELECT "id", "busId", "status", "departureAt"
          FROM "public"."Trip"
          WHERE "departureAt" >= ${start}::timestamptz
            AND "departureAt" < ${end}::timestamptz
        ), bookings AS (
          SELECT b."id", b."tripId",
            CASE WHEN b."status" = 'PENDING_PAYMENT'
              AND b."expiresAt" <= ${serverTime}::timestamptz
              THEN 'EXPIRED' ELSE b."status"::text END AS state
          FROM "public"."Booking" b JOIN trips t ON t."id" = b."tripId"
        ), allocations AS (
          SELECT b.state
          FROM bookings b
          JOIN trips t ON t."id" = b."tripId" AND t."status" = 'SCHEDULED'
          JOIN "public"."BookingSeat" s ON s."bookingId" = b."id"
            AND s."tripId" = b."tripId"
          WHERE s."releasedAt" IS NULL AND b.state <> 'EXPIRED'
        ), trip_counts AS (
          SELECT count(*) AS total,
            count(*) FILTER (WHERE "status" = 'SCHEDULED') AS scheduled,
            count(*) FILTER (WHERE "status" = 'CANCELLED') AS cancelled,
            count(*) FILTER (WHERE "status" = 'SCHEDULED' AND "departureAt" > ${serverTime}::timestamptz) AS upcoming,
            count(*) FILTER (WHERE "status" = 'SCHEDULED' AND "departureAt" <= ${serverTime}::timestamptz) AS departed
          FROM trips
        ), booking_counts AS (
          SELECT count(*) AS total,
            count(*) FILTER (WHERE state = 'RESERVED') AS reserved,
            count(*) FILTER (WHERE state = 'PENDING_PAYMENT') AS "pendingPayment",
            count(*) FILTER (WHERE state = 'PAYMENT_PROCESSING') AS "paymentProcessing",
            count(*) FILTER (WHERE state = 'CONFIRMED') AS confirmed,
            count(*) FILTER (WHERE state = 'EXPIRED') AS expired
          FROM bookings
        ), seat_counts AS (
          SELECT (SELECT count(*) FROM trips t
            JOIN "public"."BusSeat" s ON s."busId" = t."busId"
            WHERE t."status" = 'SCHEDULED') AS total,
            count(*) FILTER (WHERE state = 'RESERVED') AS reserved,
            count(*) FILTER (WHERE state = 'PENDING_PAYMENT') AS held,
            count(*) FILTER (WHERE state = 'PAYMENT_PROCESSING') AS "paymentProcessing",
            count(*) FILTER (WHERE state = 'CONFIRMED') AS confirmed,
            count(*) AS occupied
          FROM allocations
        )
        SELECT json_build_object(
          'trips', row_to_json(tc),
          'bookings', row_to_json(bc),
          'seats', to_jsonb(sc) || jsonb_build_object('available', sc.total - sc.occupied)
        )::text AS data
        FROM trip_counts tc CROSS JOIN booking_counts bc CROSS JOIN seat_counts sc
      `
        .returnsRow({ data: 'pg/text@1' })
        .build(),
    );
    if (!rows[0]) throw new Error('Statistics aggregate is missing');
    const counts = statisticsCountsSchema.parse(JSON.parse(rows[0].data));
    return {
      travelDate,
      timeZone: cairoTimeZone,
      start,
      end,
      serverTime,
      ...counts,
      seats: {
        ...counts.seats,
        occupancyPercent:
          counts.seats.total === 0
            ? 0
            : Math.round((counts.seats.occupied / counts.seats.total) * 10000) /
              100,
      },
    };
  },
};
export type AdminStatisticsService = typeof adminStatisticsService;
