import type { db as database } from '../prisma/db.ts';
import {
  adminCatalogPageSchema,
  adminCityRowSchema,
  adminStationRowSchema,
  type AdminCityListQuery,
  type AdminStationListQuery,
} from '../schemas/adminCatalogSchema.ts';

const cityPageSchema = adminCatalogPageSchema(adminCityRowSchema);
const stationPageSchema = adminCatalogPageSchema(adminStationRowSchema);

// Each statement reads the page, filtered total and relations from one snapshot.
// Search is a bound literal substring; it is never interpolated as SQL syntax.
export function createAdminCatalogService(
  db: Pick<typeof database, 'raw' | 'runtime'>,
) {
  return {
    async cities({ search, locale, limit, offset }: AdminCityListQuery) {
      const rows = await db.runtime().query(
        db.raw.sql`
          WITH filtered AS (
            SELECT c.* FROM "public"."City" c
            WHERE strpos(lower(c."nameAr" || ' ' || c."nameEn"), lower(${search})) > 0
          ), page AS (
            SELECT f.*, (SELECT count(*)::int FROM "public"."Station" s WHERE s."cityId" = f."id") AS "stationCount"
            FROM filtered f
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
      if (!rows[0]) throw new Error('City catalog page is missing');
      return cityPageSchema.parse(JSON.parse(rows[0].data));
    },
    async stations({
      search,
      locale,
      cityId,
      limit,
      offset,
    }: AdminStationListQuery) {
      const rows = await db.runtime().query(
        db.raw.sql`
          WITH filtered AS (
            SELECT s.*, json_build_object('id', c."id", 'nameAr', c."nameAr", 'nameEn', c."nameEn") AS city
            FROM "public"."Station" s JOIN "public"."City" c ON c."id" = s."cityId"
            WHERE (${cityId ?? ''} = '' OR s."cityId" = NULLIF(${cityId ?? ''}, ''))
              AND strpos(lower(s."nameAr" || ' ' || s."nameEn" || ' ' || c."nameAr" || ' ' || c."nameEn"), lower(${search})) > 0
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
      if (!rows[0]) throw new Error('Station catalog page is missing');
      return stationPageSchema.parse(JSON.parse(rows[0].data));
    },
  };
}

export const adminCatalogService = {
  async cities(query: AdminCityListQuery) {
    const { db } = await import('../prisma/db.ts');
    return createAdminCatalogService(db).cities(query);
  },
  async stations(query: AdminStationListQuery) {
    const { db } = await import('../prisma/db.ts');
    return createAdminCatalogService(db).stations(query);
  },
};
export type AdminCatalogService = typeof adminCatalogService;
