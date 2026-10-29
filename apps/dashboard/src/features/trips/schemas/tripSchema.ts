import { z } from 'zod';
import type { useTranslations } from 'next-intl';
import { Temporal } from 'temporal-polyfill';
import { calculateTripSchedule } from '../lib/tripTime';

type FormTranslations = ReturnType<typeof useTranslations<'Forms'>>;

// Convert the entered EGP amount to integer piastres without floating-point rounding.
function createPriceFormSchema(t: FormTranslations) {
  return z
    .string({ error: t('required') })
    .trim()
    .refine((value) => /^[0-9]+(?:\.[0-9]{1,2})?$/.test(value), {
      error: (issue) => (issue.input === '' ? t('required') : t('price')),
    })
    .transform((value) => {
      const [whole, fraction = ''] = value.split('.');
      return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    })
    .refine(
      (value) => Number.isInteger(value) && value >= 0 && value <= 2147483647,
      { error: t('priceRange') },
    );
}

export function createTripFormSchema(t: FormTranslations) {
  const selection = z.uuid({
    error: (issue) => (issue.input === '' ? t('required') : t('selection')),
  });
  return z
    .object(
      {
        routeId: selection,
        busId: selection,
        departureDate: z.iso.date({
          error: (issue) => (issue.input === '' ? t('required') : t('date')),
        }),
        departureTime: z
          .string({ error: t('required') })
          .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?$/, {
            error: (issue) => (issue.input === '' ? t('required') : t('time')),
          }),
        durationMinutes: z
          .string({ error: t('required') })
          .trim()
          .refine((value) => /^\d+(?:\.\d+)?$/.test(value), {
            error: (issue) =>
              issue.input === '' ? t('required') : t('wholeNumber'),
          })
          .transform(Number)
          .pipe(
            z
              .number({ error: t('invalid') })
              .positive({ error: t('positiveValue') }),
          ),
        pricePiastres: createPriceFormSchema(t),
        status: z.enum(['SCHEDULED', 'CANCELLED'], { error: t('selection') }),
      },
      { error: t?.('invalid') },
    )
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
          message: t('dateTime'),
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
    });
}

export function createBatchFormSchema(t: FormTranslations) {
  const selection = z.uuid({
    error: (issue) => (issue.input === '' ? t('required') : t('selection')),
  });
  const date = z.iso.date({
    error: (issue) => (issue.input === '' ? t('required') : t('date')),
  });
  return z
    .object(
      {
        routeId: selection,
        busId: selection,
        startDate: date,
        endDate: date,
        weekdays: z
          .array(
            z
              .string({ error: t('selection') })
              .regex(/^[1-7]$/, { error: t('selection') }),
            { error: t('selection') },
          )
          .transform((days) => days.map(Number))
          .refine((days) => days.length > 0, {
            error: t('operatingDayRequired'),
          })
          .refine((days) => days.length <= 7, {
            error: t('maxItems', { value: '7' }),
          })
          .refine((days) => new Set(days).size === days.length, {
            error: t('selection'),
          }),
        departureTime: z
          .string({ error: t('required') })
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
            error: (issue) => (issue.input === '' ? t('required') : t('time')),
          }),
        durationMinutes: z
          .string({ error: t('required') })
          .refine((value) => /^[0-9]+$/.test(value), {
            error: (issue) =>
              issue.input === '' ? t('required') : t('wholeNumber'),
          })
          .transform(Number)
          .pipe(
            z
              .number({ error: t('wholeNumber') })
              .int({ error: t('wholeNumber') })
              .min(1, { error: t('minValue', { value: '1' }) })
              .max(10080, { error: t('maxValue', { value: '10080' }) }),
          ),
        pricePiastres: createPriceFormSchema(t),
      },
      { error: t?.('invalid') },
    )
    .refine(
      (values) => {
        try {
          const days = Temporal.PlainDate.from(values.startDate).until(
            Temporal.PlainDate.from(values.endDate),
          ).days;
          return days >= 0 && days < 90;
        } catch {
          return false;
        }
      },
      { path: ['endDate'], error: t('departureDateRange') },
    );
}

export type TripFormValues = z.input<ReturnType<typeof createTripFormSchema>>;
export type TripInput = z.output<ReturnType<typeof createTripFormSchema>>;
export type Trip = TripInput & { id: string; cancelledAt?: string | null };
export type TripListQuery = {
  limit: number;
  offset: number;
  routeId: string;
  busId: string;
  status: '' | 'SCHEDULED' | 'CANCELLED';
};
export type BatchInput = z.output<ReturnType<typeof createBatchFormSchema>>;
export type BatchPreview = {
  timeZone: 'Africa/Cairo';
  canCreate: boolean;
  totalTrips: number;
  trips: (TripInput & {
    date: string;
    conflicts: (
      | { type: 'EXISTING_TRIP'; tripId: string }
      | { type: 'BATCH_TRIP'; date: string }
    )[];
  })[];
};
