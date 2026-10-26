import { z } from 'zod';
import { Temporal } from 'temporal-polyfill';
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
const cairoDateTime = z
  .string()
  .min(16)
  .transform((value, context) => {
    try {
      return Temporal.PlainDateTime.from(value)
        .toZonedDateTime('Africa/Cairo', { disambiguation: 'reject' })
        .toInstant()
        .toString();
    } catch {
      context.addIssue({
        code: 'custom',
      });
      return z.NEVER;
    }
  });
export const priceFormSchema = z
  .string()
  .trim()
  .regex(/^[0-9]+(?:\.[0-9]{1,2})?$/)
  .transform((value) => {
    const [whole, fraction = ''] = value.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  })
  .pipe(tripInputSchema.shape.pricePiastres);
export const tripFormSchema = tripInputSchema
  .extend({
    departureAt: cairoDateTime,
    arrivalAt: cairoDateTime,
    pricePiastres: priceFormSchema,
  })
  .refine((v) => Date.parse(v.arrivalAt) > Date.parse(v.departureAt), {
    path: ['arrivalAt'],
    params: { messageKey: 'arrivalAfterDeparture' },
  });
export const tripListSchema = z.object({
  limit: z.number().int().min(1).max(99),
  offset: z.number().int().min(0).max(100000),
  routeId: z.union([z.literal(''), z.uuid()]),
  busId: z.union([z.literal(''), z.uuid()]),
  status: z.enum(['', 'SCHEDULED', 'CANCELLED']),
});
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
    departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
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
      .regex(/^[0-9]+$/)
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
export type TripListQuery = z.infer<typeof tripListSchema>;
export type BatchInput = z.infer<typeof batchInputSchema>;
export type BatchPreview = z.infer<typeof batchPreviewSchema>;
