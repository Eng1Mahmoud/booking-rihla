import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';

const plateNumber = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .transform((value) => value.replace(/\s+/g, ' ').toUpperCase());
const seatCount = z.number().int().min(1).max(100);
export const createBusSchema = z.strictObject({
  plateNumber,
  seatCount,
  isActive: z.boolean().default(true),
});
// Do not reuse create defaults here: an omitted isActive must stay unchanged.
export const updateBusSchema = z
  .strictObject({
    plateNumber: plateNumber.optional(),
    seatCount: seatCount.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (input) => Object.keys(input).length > 0,
    'Provide at least one bus field',
  );
export const busIdSchema = z.uuid();
export const busListQuerySchema = paginationQuerySchema.extend({
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});
export type CreateBusInput = z.infer<typeof createBusSchema>;
export type UpdateBusInput = z.infer<typeof updateBusSchema>;
export type BusListQuery = z.infer<typeof busListQuerySchema>;
