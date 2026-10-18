import { z } from 'zod';
const reportSchema = z.object({
  total: z.coerce.number().int().nonnegative(),
  pending: z.coerce.number().int().nonnegative(),
  uncertain: z.coerce.number().int().nonnegative(),
  review: z.coerce.number().int().nonnegative(),
  succeeded: z.coerce.number().int().nonnegative(),
  refundedPiastres: z.string().regex(/^\d+$/),
});
export const refundStatisticsService = {
  async get() {
    const { db } = await import('../prisma/db.ts');
    const rows = await db.runtime().query(
      db.raw.sql`
      SELECT json_build_object(
        'total', count(*), 'pending', count(*) FILTER (WHERE r.status = 'PENDING'),
        'uncertain', count(*) FILTER (WHERE r.status IN ('REQUESTED', 'UNKNOWN')),
        'review', count(*) FILTER (WHERE r.status = 'REVIEW'),
        'succeeded', count(*) FILTER (WHERE r.status = 'SUCCEEDED'),
        'refundedPiastres', coalesce(sum(r."amountPiastres") FILTER (WHERE r.status = 'SUCCEEDED'), 0)::text
      )::text AS report FROM "public"."Refund" r
    `
        .returnsRow({ report: 'pg/text@1' })
        .build(),
    );
    if (!rows[0]) throw new Error('Refund aggregate is missing');
    return {
      ...reportSchema.parse(JSON.parse(rows[0].report)),
      currency: 'EGP',
      basis: 'LIFETIME_VERIFIED_REFUNDS',
      feesPiastres: null,
      payoutsPiastres: null,
      serverTime: new Date().toISOString(),
    };
  },
};
