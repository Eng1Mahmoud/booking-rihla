import { z } from 'zod';

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

function pageNumber(min: number, max: number) {
  return z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));
}

export const cityListQuerySchema = z.strictObject({
  limit: pageNumber(1, 100).default(20),
  offset: pageNumber(0, 100_000).default(0),
});

export type CreateCityInput = z.infer<typeof createCitySchema>;
export type CityListQuery = z.infer<typeof cityListQuerySchema>;

export type UpdateCityInput = z.infer<typeof updateCitySchema>;
