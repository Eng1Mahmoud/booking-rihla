import { z } from 'zod';
import type { useTranslations } from 'next-intl';

import { createRegisterFormSchema } from '@/features/auth/schemas/authSchema';
export function createPassengerFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      contactPhone: createRegisterFormSchema(t).shape.phone,
      names: z.record(
        z.string({ error: t('invalid') }),
        z
          .string({ error: t('required') })
          .trim()
          .min(1, { error: t('required') })
          .max(100, { error: t('maxLength', { value: '100' }) }),
        { error: t('invalid') },
      ),
    },
    { error: t?.('invalid') },
  );
}
export type PassengerValues = z.input<
  ReturnType<typeof createPassengerFormSchema>
>;
