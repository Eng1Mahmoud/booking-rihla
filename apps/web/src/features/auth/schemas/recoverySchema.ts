import { z } from 'zod';
import type { useTranslations } from 'next-intl';

import {
  createRegisterFormSchema,
  createVerificationCodeFormSchema,
} from './authSchema';

export function createRecoveryEmailFormSchema(
  t?: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    { email: createRegisterFormSchema(t).shape.email },
    { error: t?.('invalid') },
  );
}
export function createRecoveryResetSchema(
  t?: ReturnType<typeof useTranslations<'Forms'>>,
) {
  const { email, password } = createRegisterFormSchema(t).shape;
  const resetPassword = password.refine(
    (value) => new TextEncoder().encode(value).length <= 512,
    { error: t?.('passwordBytes') },
  );
  return z
    .object(
      {
        email,
        code: createVerificationCodeFormSchema(t).shape.code,
        newPassword: resetPassword,
        confirmPassword: resetPassword,
      },
      { error: t?.('invalid') },
    )
    .refine((values) => values.newPassword === values.confirmPassword, {
      path: ['confirmPassword'],
      message: t?.('passwordMismatch') ?? 'mismatch',
    });
}
export const recoveryEmailSchema = createRecoveryEmailFormSchema();
export const recoveryResetSchema = createRecoveryResetSchema();
export type RecoveryValues = z.input<
  ReturnType<typeof createRecoveryResetSchema>
>;
