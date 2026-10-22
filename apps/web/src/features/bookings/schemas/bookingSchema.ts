import { z } from 'zod';

export const createBookingSchema = z
  .strictObject({
    tripId: z.uuid(),
    contactPhone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    passengers: z
      .array(
        z.strictObject({
          seatId: z.uuid(),
          name: z.string().trim().min(1).max(100),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (input) =>
      new Set(input.passengers.map((person) => person.seatId)).size ===
      input.passengers.length,
  );

export const bookingIdSchema = z.uuid();
// Status polling accepts a booking id and no query parameters.
export const paymentStatusInputSchema = z.strictObject({
  bookingId: bookingIdSchema,
  search: z.literal(''),
});
export const bookingsOffsetSchema = z.number().int().min(0).max(100000);
export const bookingFilterSchema = z.enum([
  'all',
  'upcoming',
  'past',
  'expired',
  'cancelled',
]);
export const bookingsListInputSchema = z.strictObject({
  offset: bookingsOffsetSchema,
  filter: bookingFilterSchema.default('all'),
});
export type BookingFilter = z.infer<typeof bookingFilterSchema>;
export const checkoutSchema = z
  .strictObject({
    id: bookingIdSchema,
    prepare: z.boolean(),
    idempotencyKey: z
      .uuid()
      .transform((value) => value.toLowerCase())
      .optional(),
  })
  .refine((input) => !input.prepare || Boolean(input.idempotencyKey));

export type CreateBookingInput = z.input<typeof createBookingSchema>;
export type CheckoutInput = z.input<typeof checkoutSchema>;
