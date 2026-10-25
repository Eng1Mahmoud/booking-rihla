import { z } from 'zod';
export const amenityInputSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{0,31}$/),
  nameAr: z.string().trim().min(1).max(100),
  nameEn: z.string().trim().min(1).max(100),
});
export const amenitySchema = amenityInputSchema.extend({ id: z.uuid() });
export const saveAmenitySchema = amenityInputSchema.extend({
  id: z.uuid().optional(),
});
export const amenityIdSchema = z.uuid();
export type AmenityInput = z.infer<typeof amenityInputSchema>;
