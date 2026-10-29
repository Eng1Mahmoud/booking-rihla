import { z } from 'zod';
import { createBookingSchema } from '@/features/bookings';
export const passengerSchema = z.object({
  contactPhone: createBookingSchema.shape.contactPhone,
  names: z.record(z.string(), z.string().trim().min(1).max(100)),
});
export type PassengerValues = z.input<typeof passengerSchema>;
