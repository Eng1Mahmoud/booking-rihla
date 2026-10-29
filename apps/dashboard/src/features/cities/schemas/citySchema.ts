import { z } from 'zod';
import type { useTranslations } from 'next-intl';

export function createCityFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const name = z
    .string({ error: t('required') })
    .trim()
    .min(1, { error: t('required') })
    .max(100, { error: t('maxLength', { value: '100' }) });
  return z.strictObject(
    { nameAr: name, nameEn: name },
    { error: t?.('invalid') },
  );
}
export type CityInput = z.output<ReturnType<typeof createCityFormSchema>>;
