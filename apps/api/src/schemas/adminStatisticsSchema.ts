import { z } from 'zod';
import { cairoToday } from '../utils/cairoTime.ts';
export const adminStatisticsQuerySchema = z.strictObject({
  travelDate: z.iso
    .date()
    .refine(
      (value) => value >= '2000-01-01' && value <= '9998-12-31',
      'Use a date from 2000 through 9998',
    )
    .default(cairoToday),
});
export type AdminStatisticsQuery = z.infer<typeof adminStatisticsQuerySchema>;
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const statisticsCountsSchema = z.strictObject({
  trips: z.strictObject({
    total: count,
    scheduled: count,
    cancelled: count,
    upcoming: count,
    departed: count,
  }),
  bookings: z.strictObject({
    total: count,
    reserved: count,
    pendingPayment: count,
    paymentProcessing: count,
    confirmed: count,
    expired: count,
  }),
  seats: z.strictObject({
    total: count,
    reserved: count,
    held: count,
    paymentProcessing: count,
    confirmed: count,
    occupied: count,
    available: count,
  }),
});
