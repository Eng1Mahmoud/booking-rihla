import { z } from 'zod';
export const cityInputSchema = z.strictObject({
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
});
export const citySchema = cityInputSchema.extend({ id: z.uuid() });
export const cityRowSchema = citySchema.extend({
  stationCount: z.number().int().nonnegative(),
});
export const saveCitySchema = cityInputSchema.extend({
  id: z.uuid().optional(),
});
export const cityIdSchema = z.uuid();
export type CityInput = z.infer<typeof cityInputSchema>;
