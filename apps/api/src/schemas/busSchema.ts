import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

const plateNumber = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/\s+/g, ' ').toUpperCase());
const busTypeId = z.uuid().nullable();
const amenityIds = z
  .array(z.uuid())
  .max(30)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    'Choose each amenity once',
  );
const seatCount = z.number().int().min(1).max(100);
export const createBusSchema = z.strictObject({
  plateNumber,
  seatCount,
  isActive: z.boolean().default(true),
  busTypeId: busTypeId.optional(),
  amenityIds: amenityIds.optional(),
});
// Do not reuse create defaults here: an omitted isActive must stay unchanged.
export const updateBusSchema = z
  .strictObject({
    plateNumber: plateNumber.optional(),
    seatCount: seatCount.optional(),
    isActive: z.boolean().optional(),
    busTypeId: busTypeId.optional(),
    amenityIds: amenityIds.optional(),
  })
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one bus field',
  );
export const busIdSchema = z.uuid();
export const busListQuerySchema = paginationQuerySchema.extend({
  busTypeId: z.uuid().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type CreateBusInput = z.infer<typeof createBusSchema>;
export type UpdateBusInput = z.infer<typeof updateBusSchema>;
export type BusListQuery = z.infer<typeof busListQuerySchema>;
