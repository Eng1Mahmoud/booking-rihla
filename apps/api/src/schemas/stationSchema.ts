import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

export const createStationSchema = z.strictObject({
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
  cityId: z.uuid(),
});
export const updateStationSchema = createStationSchema
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one station field',
  );
export const stationIdSchema = z.uuid();
export const stationListQuerySchema = paginationQuerySchema.extend({
  cityId: z.uuid().optional(),
});
export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type StationListQuery = z.infer<typeof stationListQuerySchema>;
