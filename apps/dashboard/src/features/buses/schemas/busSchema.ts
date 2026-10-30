import type { useTranslations } from 'next-intl';
import { z } from 'zod';

import type { ListQuery } from '@/shared/types/list';
export function createBusFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.strictObject(
    {
      plateNumber: z
        .string({ error: t('required') })
        .trim()
        .min(1, { error: t('required') })
        .max(32, { error: t('maxLength', { value: '32' }) })
        .transform((value) => value.replace(/\s+/g, ' ').toUpperCase()),
      seatCount: z
        .string({ error: t('required') })
        .trim()
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
            .max(100, { error: t('maxValue', { value: '100' }) }),
        ),
      seatLayout: z
        .enum(['', 'STANDARD_2_2'], { error: t('selection') })
        .transform((value) => value || null),
      isActive: z.boolean({ error: t('selection') }),
      busTypeId: z
        .union(
          [
            z.literal('', { error: t('selection') }),
            z.uuid({ error: t('selection') }),
          ],
          { error: t('selection') },
        )
        .transform((value) => value || null),
      amenityIds: z
        .array(z.uuid({ error: t('selection') }), { error: t('selection') })
        .max(30, { error: t('maxItems', { value: '30' }) })
        .refine((ids) => new Set(ids).size === ids.length, {
          error: t('selection'),
        }),
    },
    { error: t?.('invalid') },
  );
}
export type BusInput = z.output<ReturnType<typeof createBusFormSchema>>;
export type BusFormValues = z.input<ReturnType<typeof createBusFormSchema>>;
export type BusListQuery = ListQuery & {
  busTypeId: string;
  isActive: '' | 'true' | 'false';
};
