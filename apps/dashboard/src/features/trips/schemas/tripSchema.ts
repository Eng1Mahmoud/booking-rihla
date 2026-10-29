import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';
import { calculateTripSchedule } from '../lib/tripTime';
export const tripInputSchema = z.object({
  routeId: z.uuid(),
  busId: z.uuid(),
  departureAt: z.iso.datetime({ offset: true }),
  arrivalAt: z.iso.datetime({ offset: true }),
  pricePiastres: z.number().int().min(0).max(2147483647),
  status: z.enum(['SCHEDULED', 'CANCELLED']),
});
export const tripSchema = tripInputSchema.extend({
  id: z.uuid(),
  cancelledAt: z.string().nullable().optional(),
});
export const priceFormSchema = z
  .string()
  .trim()
  .refine((value) => /^[0-9]+(?:\.[0-9]{1,2})?$/.test(value), {
    params: { messageKey: 'price' },
  })
  .transform((value) => {
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  })
  .refine((value) => value <= 2147483647, {
    params: { messageKey: 'priceRange' },
  })
  .pipe(tripInputSchema.shape.pricePiastres);
export const tripFormSchema = z
  .object({
    routeId: tripInputSchema.shape.routeId,
    busId: tripInputSchema.shape.busId,
    departureDate: z.iso.date(),
    departureTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/),
    durationMinutes: z
      .string()
      .trim()
      .refine((value) => /^\d+(?:\.\d+)?$/.test(value), {
        params: { messageKey: 'wholeNumber' },
      })
      .transform(Number)
      .pipe(z.number().positive()),
    pricePiastres: priceFormSchema,
    status: tripInputSchema.shape.status,
  })
  .transform((values, context) => {
    const schedule = calculateTripSchedule(
      values.departureDate,
      values.departureTime,
      values.durationMinutes,
    );
    if (!schedule) {
      context.addIssue({
        code: 'custom',
        path: ['departureTime'],
        params: { messageKey: 'dateTime' },
      });
      return z.NEVER;
    }
    return {
      routeId: values.routeId,
      busId: values.busId,
      ...schedule,
      pricePiastres: values.pricePiastres,
      status: values.status,
    };
  })
  .pipe(tripInputSchema);
export type TripFormValues = z.input<typeof tripFormSchema>;
export const batchInputSchema = z
  .object({
    routeId: z.uuid(),
    busId: z.uuid(),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    weekdays: z
      .array(z.number().int().min(1).max(7))
      .refine((days) => days.length > 0, {
        params: { messageKey: 'operatingDayRequired' },
      })
      .max(7)
      .refine((days) => new Set(days).size === days.length),
    departureTime: z
      .string()
      .refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
        params: { messageKey: 'time' },
      }),
    durationMinutes: z.number().int().min(1).max(10080),
    pricePiastres: tripInputSchema.shape.pricePiastres,
  })
  .refine(
    (v) => {
      try {
        const days = Temporal.PlainDate.from(v.startDate).until(
          Temporal.PlainDate.from(v.endDate),
        ).days;
        return days >= 0 && days < 90;
      } catch {
        return false;
      }
    },
    { path: ['endDate'], params: { messageKey: 'departureDateRange' } },
  );
export const batchFormSchema = z
  .object({
    ...batchInputSchema.shape,
    durationMinutes: z
      .string()
      .refine((value) => /^[0-9]+$/.test(value), {
        params: { messageKey: 'wholeNumber' },
      })
      .transform(Number)
      .pipe(batchInputSchema.shape.durationMinutes),
    pricePiastres: priceFormSchema,
    weekdays: z
      .array(z.string().regex(/^[1-7]$/))
      .transform((days) => days.map(Number))
      .pipe(batchInputSchema.shape.weekdays),
  })
  .refine(
    (v) => {
      try {
        const days = Temporal.PlainDate.from(v.startDate).until(
          Temporal.PlainDate.from(v.endDate),
        ).days;
        return days >= 0 && days < 90;
      } catch {
        return false;
      }
    },
    { path: ['endDate'], params: { messageKey: 'departureDateRange' } },
  );
export const batchPreviewSchema = z.object({
  timeZone: z.literal('Africa/Cairo'),
  canCreate: z.boolean(),
  totalTrips: z.number().int().min(1).max(90),
  trips: z
    .array(
      tripSchema.omit({ id: true, cancelledAt: true }).extend({
        date: z.iso.date(),
        conflicts: z.array(
          z.union([
            z.object({ type: z.literal('EXISTING_TRIP'), tripId: z.uuid() }),
            z.object({ type: z.literal('BATCH_TRIP'), date: z.iso.date() }),
          ]),
        ),
      }),
    )
    .min(1)
    .max(90),
});
export const cancellationSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(5).max(500),
});
export type Trip = z.infer<typeof tripSchema>;
export type TripInput = z.infer<typeof tripInputSchema>;
export type TripListQuery = {
  limit: number;
  offset: number;
  routeId: string;
  busId: string;
  status: '' | 'SCHEDULED' | 'CANCELLED';
};
export type BatchInput = z.infer<typeof batchInputSchema>;
export type BatchPreview = z.infer<typeof batchPreviewSchema>;
