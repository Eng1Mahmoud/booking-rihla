import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

export const createCitySchema = z.strictObject({
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
});

export const updateCitySchema = createCitySchema
  .partial()
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one city name',
  );

export const cityIdSchema = z.uuid();

export const cityListQuerySchema = paginationQuerySchema;

export type CreateCityInput = z.infer<typeof createCitySchema>;
export type CityListQuery = z.infer<typeof cityListQuerySchema>;

export type UpdateCityInput = z.infer<typeof updateCitySchema>;
