import { z } from 'zod';
import { paginationQuerySchema } from './paginationSchema.ts';
import { registerSchema } from './authSchema.ts';

export const adminBookingListQuerySchema = paginationQuerySchema.extend({
  reference: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^BUS-[A-F0-9]{16}$/)
    .optional(),
  tripId: z.uuid().optional(),
  userId: z.uuid().optional(),
  email: registerSchema.shape.email.optional(),
  travelDate: z.iso
    .date()
    .refine(
      (value) => value >= '2000-01-01' && value <= '9998-12-31',
      'Use a date from 2000 through 9998',
    )
    .optional(),
});
export type AdminBookingListQuery = z.infer<typeof adminBookingListQuerySchema>;
