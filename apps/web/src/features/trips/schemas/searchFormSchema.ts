import { z } from 'zod';
import type { useTranslations } from 'next-intl';
import { isCalendarDate } from './searchSchema';
export function searchFormSchema(
  today: string,
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const destination = z
    .string({ error: t('required') })
    .regex(/^(city|station):[0-9a-f-]{36}$/i, {
      error: (issue) => (issue.input === '' ? t('required') : t('selection')),
    });
  return z
    .object({
      origin: destination,
      destination,
      date: z
        .string({ error: t('required') })
        .refine(isCalendarDate, {
          error: (issue) => (issue.input === '' ? t('required') : t('date')),
        })
        .refine((value) => !isCalendarDate(value) || value >= today, {
          error: t('upcomingDate'),
        }),
    })
    .refine((values) => values.origin !== values.destination, {
      path: ['destination'],
      error: t('differentLocations'),
    });
}
export type SearchFormValues = z.input<ReturnType<typeof searchFormSchema>>;
