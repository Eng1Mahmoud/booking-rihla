import type { db as database } from '../prisma/db.ts';
import {
  adminBusPageSchema,
  type AdminBusListQuery,
} from '../schemas/adminBusSchema.ts';
export function createAdminBusService(
  db: Pick<typeof database, 'raw' | 'runtime'>,
) {
  return {
    async list({
      search,
      busTypeId,
      isActive,
      limit,
      offset,
    }: AdminBusListQuery) {
      const rows = await db.runtime().query(
        db.raw.sql`
        WITH filtered AS (
          SELECT b.* FROM "public"."Bus" b
          WHERE strpos(lower(b."plateNumber"), lower(${search})) > 0
            AND (${busTypeId ?? ''} = '' OR b."busTypeId" = NULLIF(${busTypeId ?? ''}, ''))
            AND (${isActive === undefined ? '' : String(isActive)} = '' OR b."isActive" = NULLIF(${isActive === undefined ? '' : String(isActive)}, '')::boolean)
        ), page AS (
          SELECT f."id", f."plateNumber", f."seatCount", f."seatLayout", f."isActive", f."busTypeId",
            CASE WHEN t."id" IS NULL THEN NULL ELSE json_build_object('id', t."id", 'code', t."code", 'nameAr', t."nameAr", 'nameEn', t."nameEn") END AS "busType",
            coalesce((SELECT json_agg(json_build_object('id', a."id", 'code', a."code", 'nameAr', a."nameAr", 'nameEn', a."nameEn") ORDER BY a."code", a."id")
              FROM "public"."BusAmenity" ba JOIN "public"."Amenity" a ON a."id" = ba."amenityId"
              WHERE ba."busId" = f."id"), '[]'::json) AS amenities
          FROM filtered f LEFT JOIN "public"."BusType" t ON t."id" = f."busTypeId"
          ORDER BY f."plateNumber", f."id" LIMIT ${limit} OFFSET ${offset}
        )
        SELECT json_build_object(
          'items', coalesce((SELECT json_agg(p ORDER BY p."plateNumber", p."id") FROM page p), '[]'::json),
          'total', (SELECT count(*)::int FROM filtered),
          'pagination', json_build_object('limit', ${limit}::int, 'offset', ${offset}::int)
        )::text AS data
      `
          .returnsRow({ data: 'pg/text@1' })
          .build(),
      );
      if (!rows[0]) throw new Error('Bus catalog page is missing');
      return adminBusPageSchema.parse(JSON.parse(rows[0].data));
    },
  };
}
export const adminBusService = {
  async list(query: AdminBusListQuery) {
    const { db } = await import('../prisma/db.ts');
    return createAdminBusService(db).list(query);
  },
};
export type AdminBusService = typeof adminBusService;
