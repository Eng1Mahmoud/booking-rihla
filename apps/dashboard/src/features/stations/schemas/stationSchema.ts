import { z } from 'zod';
import type { useTranslations } from 'next-intl';

import type { ListQuery } from '@/shared/types/list';
export function createStationFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const name = z
    .string({ error: t('required') })
    .trim()
    .min(1, { error: t('required') })
    .max(100, { error: t('maxLength', { value: '100' }) });
  return z.strictObject(
    {
      nameAr: name,
      nameEn: name,
      cityId: z.uuid({
        error: (issue) => (issue.input === '' ? t('required') : t('selection')),
      }),
    },
    { error: t?.('invalid') },
  );
}
export type StationInput = z.output<ReturnType<typeof createStationFormSchema>>;
export type StationListQuery = ListQuery & { cityId?: string };
