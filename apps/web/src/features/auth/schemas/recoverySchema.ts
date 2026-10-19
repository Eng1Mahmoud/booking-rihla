import { z } from 'zod';
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
const password = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => new TextEncoder().encode(value).length <= 512);
export const recoveryEmailSchema = z.object({ email });
export const recoveryResetSchema = z
  .object({
    email,
    code: z.string().regex(/^\d{6}$/),
    newPassword: password,
    confirmPassword: password,
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  });
export type RecoveryValues = z.input<typeof recoveryResetSchema>;
