import { z } from 'zod';
import { registerSchema } from './authSchema.ts';
import { paginationQuerySchema } from './paginationSchema.ts';
export const createBookingSchema = z
  .strictObject({
    tripId: z.uuid(),
    contactPhone: registerSchema.shape.phone,
    passengers: z
      .array(
        z.strictObject({ seatId: z.uuid(), name: registerSchema.shape.name }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (input) =>
      new Set(input.passengers.map((passenger) => passenger.seatId)).size ===
      input.passengers.length,
    'Choose each seat only once',
  );
export const bookingIdSchema = z.uuid();
export const bookingListQuerySchema = paginationQuerySchema;
export const bookingDetailsQuerySchema = z.strictObject({});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingListQuery = z.infer<typeof bookingListQuerySchema>;
