import { z } from 'zod';
import type { useTranslations } from 'next-intl';
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const metadata = {
  timeZone: z.literal('Africa/Cairo'),
  serverTime: z.iso.datetime(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
};
export const reportDateSchema = z.iso
  .date()
  .refine((value) => value >= '2000-01-01' && value <= '9998-12-31');
export const operationReportSchema = z.object({
  ...metadata,
  travelDate: reportDateSchema,
  trips: z.object({
    total: count,
    scheduled: count,
    upcoming: count,
    departed: count,
    cancelled: count,
  }),
  bookings: z.object({
    total: count,
    reserved: count,
    pendingPayment: count,
    paymentProcessing: count,
    confirmed: count,
    expired: count,
    cancelled: count,
  }),
  seats: z.object({
    total: count,
    reserved: count,
    held: count,
    paymentProcessing: count,
    confirmed: count,
    occupied: count,
    available: count,
    occupancyPercent: z.number().min(0).max(100),
  }),
});
export const paymentReportSchema = z.object({
  ...metadata,
  date: reportDateSchema,
  dateBasis: z.literal('SETTLEMENT_LAST_UPDATED_AT'),
  currency: z.literal('EGP'),
  settlements: z.object({
    total: count,
    paid: count,
    refundRequired: count,
    requested: count,
    unknown: count,
    requiresReview: count,
  }),
  paid: z.object({
    amountPiastres: z.string().regex(/^(0|[1-9][0-9]*)$/),
    amountEGP: z.string().regex(/^\d+\.\d{2}$/),
  }),
});

export function createReportDateFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      date: z.iso
        .date({
          error: (issue) => (issue.input === '' ? t('required') : t('date')),
        })
        .refine((value) => value >= '2000-01-01' && value <= '9998-12-31', {
          error: t('date'),
        }),
    },
    { error: t?.('invalid') },
  );
}
