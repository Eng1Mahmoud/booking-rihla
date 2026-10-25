import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';
import { createCitySchema } from './citySchema.ts';
import { createStationSchema } from './stationSchema.ts';

export const adminCityListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(200).default(''),
  locale: z.enum(['ar', 'en']).default('en'),
});
export const adminStationListQuerySchema = adminCityListQuerySchema.extend({
  cityId: z.uuid().optional(),
});
export const adminCityRowSchema = createCitySchema.extend({
  id: z.uuid(),
  stationCount: z.number().int().nonnegative(),
});
export const adminStationRowSchema = createStationSchema.extend({
  id: z.uuid(),
  city: createCitySchema.extend({ id: z.uuid() }),
});
export function adminCatalogPageSchema<T>(item: z.ZodType<T>) {
  return z.strictObject({
    items: z.array(item).max(100),
    total: z.number().int().nonnegative(),
    pagination: z.strictObject({
      limit: z.number().int().min(1).max(100),
      offset: z.number().int().min(0).max(100_000),
    }),
  });
}
export type AdminCityListQuery = z.infer<typeof adminCityListQuerySchema>;
export type AdminStationListQuery = z.infer<typeof adminStationListQuerySchema>;
