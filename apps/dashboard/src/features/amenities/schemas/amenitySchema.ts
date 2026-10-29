import { z } from 'zod';
import type { useTranslations } from 'next-intl';

export function createAmenityFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const name = z
    .string({ error: t('required') })
    .trim()
    .min(1, { error: t('required') })
    .max(100, { error: t('maxLength', { value: '100' }) });
  return z.strictObject(
    {
      code: z
        .string({ error: t('required') })
        .trim()
        .toUpperCase()
        .refine((value) => /^[A-Z][A-Z0-9_]{0,31}$/.test(value), {
          error: (issue) => (issue.input === '' ? t('required') : t('code')),
        }),
      nameAr: name,
      nameEn: name,
    },
    { error: t?.('invalid') },
  );
}
export type AmenityInput = z.output<ReturnType<typeof createAmenityFormSchema>>;
