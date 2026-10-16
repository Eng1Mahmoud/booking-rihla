import { Temporal } from 'temporal-polyfill';
import { z } from 'zod';

export const tripBatchSchema = z
  .strictObject({
    routeId: z.uuid(),
    busId: z.uuid(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .min(1)
      .max(7)
      .refine(
        (days) => new Set(days).size === days.length,
        'Choose each weekday once',
      ),
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    durationMinutes: z.number().int().min(1).max(10080),
    pricePiastres: z.number().int().min(0).max(2147483647),
  })
  .refine((input) => {
    try {
      const days = Temporal.PlainDate.from(input.startDate).until(
        Temporal.PlainDate.from(input.endDate),
      ).days;
      return days >= 0 && days < 90;
    } catch {
      return false;
    }
  }, 'Choose an inclusive date range of 1-90 days');
export const tripBatchQuerySchema = z.strictObject({});
export type TripBatchInput = z.infer<typeof tripBatchSchema>;
