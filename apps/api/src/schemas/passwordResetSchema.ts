import { z } from 'zod';
import { registerSchema } from './authSchema.ts';
export const forgotPasswordSchema = registerSchema.pick({ email: true });
export const resetPasswordSchema = z
  .strictObject({
    email: registerSchema.shape.email,
    code: z.string().regex(/^\d{6}$/),
    newPassword: registerSchema.shape.password,
    confirmPassword: registerSchema.shape.password,
  })
  .refine(
    (input) => input.newPassword === input.confirmPassword,
    'Passwords must match',
  );
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
