import { z } from 'zod';
import type { useTranslations } from 'next-intl';

export function createLoginFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      email: z
        .string({ error: t('required') })
        .trim()
        .toLowerCase()
        .pipe(
          z
            .email({
              error: (issue) =>
                issue.input === '' ? t('required') : t('email'),
            })
            .max(254, { error: t('maxLength', { value: '254' }) }),
        ),
      password: z
        .string({ error: t('required') })
        .min(12, {
          error: (issue) =>
            issue.input === ''
              ? t('required')
              : t('minLength', { value: '12' }),
        })
        .max(128, { error: t('maxLength', { value: '128' }) }),
    },
    { error: t?.('invalid') },
  );
}
export type LoginValues = z.output<ReturnType<typeof createLoginFormSchema>>;
