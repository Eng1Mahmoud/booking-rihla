import { z } from 'zod';
import type { useTranslations } from 'next-intl';

// Server Actions reuse these rules without UI messages; forms provide the current translation.
export function createRegisterFormSchema(
  t?: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      name: z
        .string({ error: t?.('required') })
        .trim()
        .min(1, { error: t?.('required') })
        .max(100, { error: t?.('maxLength', { value: '100' }) }),
      email: z
        .string({ error: t?.('required') })
        .trim()
        .toLowerCase()
        .pipe(
          z
            .email({
              error: (issue) =>
                issue.input === '' ? t?.('required') : t?.('email'),
            })
            .max(254, { error: t?.('maxLength', { value: '254' }) }),
        ),
      phone: z
        .string({ error: t?.('required') })
        .transform((value) =>
          value
            .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
            .trim(),
        )
        .pipe(
          z.string().regex(/^\+[1-9]\d{7,14}$/, {
            error: (issue) =>
              issue.input === '' ? t?.('required') : t?.('phone'),
          }),
        ),
      password: z
        .string({ error: t?.('required') })
        .min(12, {
          error: (issue) =>
            issue.input === ''
              ? t?.('required')
              : t?.('minLength', { value: '12' }),
        })
        .max(128, { error: t?.('maxLength', { value: '128' }) }),
    },
    { error: t?.('invalid') },
  );
}
export function createLoginFormSchema(
  t: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return createRegisterFormSchema(t).pick({ email: true, password: true });
}
export function createVerificationCodeFormSchema(
  t?: ReturnType<typeof useTranslations<'Forms'>>,
) {
  return z.object(
    {
      code: z.string({ error: t?.('required') }).regex(/^\d{6}$/, {
        error: (issue) =>
          issue.input === '' ? t?.('required') : t?.('verificationCode'),
      }),
    },
    { error: t?.('invalid') },
  );
}

export const registerSchema = createRegisterFormSchema();
export const loginSchema = registerSchema.pick({ email: true, password: true });
export const resendVerificationSchema = z.object({
  email: registerSchema.shape.email,
  verificationId: z.uuid(),
});
export const verifyEmailSchema = resendVerificationSchema.extend(
  createVerificationCodeFormSchema().shape,
);
