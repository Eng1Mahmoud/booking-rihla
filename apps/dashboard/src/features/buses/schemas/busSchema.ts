import { z } from 'zod';
import { listQuerySchema } from '@/shared/schemas/listSchema';
import { busTypeSchema } from '@/features/bus-types/schemas/busTypeSchema';
import { amenitySchema } from '@/features/amenities/schemas/amenitySchema';
export const busInputSchema = z.strictObject({
  plateNumber: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.replace(/\s+/g, ' ').toUpperCase()),
  seatCount: z.number().int().min(1).max(100),
  seatLayout: z.enum(['STANDARD_2_2']).nullable(),
  isActive: z.boolean(),
  busTypeId: z.uuid().nullable(),
  amenityIds: z
    .array(z.uuid())
    .max(30)
    .refine((ids) => new Set(ids).size === ids.length),
});
export const busFormSchema = busInputSchema.extend({
  seatCount: z
    .string()
    .trim()
    .refine((value) => /^[0-9]+$/.test(value), {
      params: { messageKey: 'wholeNumber' },
    })
    .transform(Number)
    .pipe(busInputSchema.shape.seatCount),
  seatLayout: z.enum(['', 'STANDARD_2_2']).transform((value) => value || null),
  busTypeId: z
    .union([z.literal(''), z.uuid()])
    .transform((value) => value || null),
});
export const busSchema = busInputSchema.omit({ amenityIds: true }).extend({
  id: z.uuid(),
  busType: busTypeSchema.nullable(),
  amenities: z.array(amenitySchema).max(30),
});
export const busListQuerySchema = listQuerySchema.extend({
  busTypeId: z.union([z.literal(''), z.uuid()]),
  isActive: z.enum(['', 'true', 'false']),
});
export const saveBusSchema = busInputSchema.extend({ id: z.uuid().optional() });
export const busIdSchema = z.uuid();
export type BusInput = z.infer<typeof busInputSchema>;
export type BusFormValues = z.input<typeof busFormSchema>;
export type BusListQuery = z.infer<typeof busListQuerySchema>;
