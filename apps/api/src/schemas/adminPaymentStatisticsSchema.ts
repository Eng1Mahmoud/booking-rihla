import { z } from 'zod';
import { cairoToday } from '../utils/cairoTime.ts';

export const adminPaymentStatisticsQuerySchema = z.strictObject({
  date: z.iso
    .date()
    .refine(
      (value) => value >= '2000-01-01' && value <= '9998-12-31',
      'Use a date from 2000 through 9998',
    )
    .default(cairoToday),
});
export type AdminPaymentStatisticsQuery = z.infer<
  typeof adminPaymentStatisticsQuerySchema
>;

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const paymentStatisticsCountsSchema = z.strictObject({
  total: count,
  captured: count,
  voided: count,
  requested: count,
  unknown: count,
  requiresReview: count,
  capturedPiastres: z.string().regex(/^(0|[1-9][0-9]*)$/),
});
