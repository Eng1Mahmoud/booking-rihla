import { z } from 'zod';
import type { useTranslations } from 'next-intl';

import { createRegisterFormSchema } from '@/features/auth/schemas/authSchema';
export function createProfileFormSchema(
  t?: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const { name, phone } = createRegisterFormSchema(t).shape;
  return z.strictObject({ name, phone }, { error: t?.('invalid') });
}
export type ProfileInput = z.output<ReturnType<typeof createProfileFormSchema>>;
export const profileSchema = createProfileFormSchema();
