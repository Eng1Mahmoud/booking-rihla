import { z } from 'zod';
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const station = z.object({
  id: z.uuid(),
  nameAr: z.string(),
  nameEn: z.string(),
  city: z.object({ nameAr: z.string(), nameEn: z.string() }),
});
export const bookingSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  status: z.enum([
    'RESERVED',
    'PENDING_PAYMENT',
    'PAYMENT_PROCESSING',
    'CONFIRMED',
    'EXPIRED',
    'CANCELLED',
  ]),
  expiresAt: z.string().nullable(),
  currency: z.literal('EGP'),
  contactPhone: z.string(),
  seatCount: count,
  unitPricePiastres: count,
  totalPiastres: count,
  createdAt: z.string(),
  refund: z
    .object({
      id: z.uuid(),
      status: z.string(),
      amountPiastres: z.string().regex(/^[0-9]+$/),
    })
    .nullable(),
  customer: z.object({
    id: z.uuid(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  trip: z.object({
    id: z.uuid(),
    busId: z.uuid(),
    status: z.enum(['SCHEDULED', 'CANCELLED']),
    departureAt: z.string(),
    arrivalAt: z.string(),
    route: z.object({ originStation: station, destinationStation: station }),
  }),
});
export const bookingDetailSchema = bookingSchema.extend({
  passengers: z.array(
    z.object({
      seatId: z.uuid(),
      seatNumber: z.number().int().positive(),
      name: z.string(),
    }),
  ),
});
const uuidFilter = z.union([z.literal(''), z.uuid()]);
export const bookingFiltersSchema = z.object({
  reference: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^BUS-[A-F0-9]{16}$/),
  ]),
  email: z.union([z.literal(''), z.email()]),
  travelDate: z.union([z.literal(''), z.iso.date()]),
  tripId: uuidFilter,
  userId: uuidFilter,
});
export const bookingListSchema = bookingFiltersSchema.extend({
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0).max(100000),
});
export type Booking = z.infer<typeof bookingSchema>;
export type BookingFilters = z.infer<typeof bookingFiltersSchema>;
export type BookingDetail = z.infer<typeof bookingDetailSchema>;
