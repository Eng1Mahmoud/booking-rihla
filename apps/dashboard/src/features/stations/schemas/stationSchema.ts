import { z } from 'zod';
import {
  cityInputSchema,
  citySchema,
} from '@/features/cities/schemas/citySchema';
import type { ListQuery } from '@/shared/types/list';
export const stationInputSchema = cityInputSchema.extend({ cityId: z.uuid() });
export const stationSchema = stationInputSchema.extend({ id: z.uuid() });
export const stationRowSchema = stationSchema.extend({ city: citySchema });
export const saveStationSchema = stationInputSchema.extend({
  id: z.uuid().optional(),
});
export const stationIdSchema = z.uuid();
export type StationInput = z.infer<typeof stationInputSchema>;
export type StationListQuery = ListQuery & { cityId?: string };
