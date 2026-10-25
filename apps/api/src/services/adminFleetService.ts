import type { db as database } from '../prisma/db.ts';
import {
  adminFleetPageSchema,
  type AdminFleetListQuery,
} from '../schemas/adminFleetSchema.ts';

// Bound substring search and snapshot-consistent totals, as in adminCatalogService.
export function createAdminFleetService(
  db: Pick<typeof database, 'raw' | 'runtime'>,
) {
  return {
    async busTypes({ search, locale, limit, offset }: AdminFleetListQuery) {
      const rows = await db.runtime().query(
        db.raw.sql`
          WITH filtered AS (
            SELECT m."id", m."code", m."nameAr", m."nameEn" FROM "public"."BusType" m
            WHERE strpos(lower(m."code" || ' ' || m."nameAr" || ' ' || m."nameEn"), lower(${search})) > 0
          ), page AS (
            SELECT * FROM filtered f
            ORDER BY CASE WHEN ${locale} = 'ar' THEN f."nameAr" ELSE f."nameEn" END, f."id"
            LIMIT ${limit} OFFSET ${offset}
          )
          SELECT json_build_object(
            'items', coalesce((SELECT json_agg(p ORDER BY CASE WHEN ${locale} = 'ar' THEN p."nameAr" ELSE p."nameEn" END, p."id") FROM page p), '[]'::json),
            'total', (SELECT count(*)::int FROM filtered),
            'pagination', json_build_object('limit', ${limit}::int, 'offset', ${offset}::int)
          )::text AS data
        `
          .returnsRow({ data: 'pg/text@1' })
          .build(),
      );
      if (!rows[0]) throw new Error('BusType catalog page is missing');
      return adminFleetPageSchema.parse(JSON.parse(rows[0].data));
    },
    async amenities({ search, locale, limit, offset }: AdminFleetListQuery) {
      const rows = await db.runtime().query(
        db.raw.sql`
          WITH filtered AS (
            SELECT m."id", m."code", m."nameAr", m."nameEn" FROM "public"."Amenity" m
            WHERE strpos(lower(m."code" || ' ' || m."nameAr" || ' ' || m."nameEn"), lower(${search})) > 0
          ), page AS (
            SELECT * FROM filtered f
            ORDER BY CASE WHEN ${locale} = 'ar' THEN f."nameAr" ELSE f."nameEn" END, f."id"
            LIMIT ${limit} OFFSET ${offset}
          )
          SELECT json_build_object(
            'items', coalesce((SELECT json_agg(p ORDER BY CASE WHEN ${locale} = 'ar' THEN p."nameAr" ELSE p."nameEn" END, p."id") FROM page p), '[]'::json),
            'total', (SELECT count(*)::int FROM filtered),
            'pagination', json_build_object('limit', ${limit}::int, 'offset', ${offset}::int)
          )::text AS data
        `
          .returnsRow({ data: 'pg/text@1' })
          .build(),
      );
      if (!rows[0]) throw new Error('Amenity catalog page is missing');
      return adminFleetPageSchema.parse(JSON.parse(rows[0].data));
    },
  };
}
export const adminFleetService = {
  async busTypes(query: AdminFleetListQuery) {
    const { db } = await import('../prisma/db.ts');
    return createAdminFleetService(db).busTypes(query);
  },
  async amenities(query: AdminFleetListQuery) {
    const { db } = await import('../prisma/db.ts');
    return createAdminFleetService(db).amenities(query);
  },
};
export type AdminFleetService = typeof adminFleetService;
