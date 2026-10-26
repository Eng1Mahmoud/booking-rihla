import { z } from 'zod';
export const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  phone: z
    .string()
    .transform((value) =>
      value
        .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
        .trim(),
    )
    .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/)),
  password: z.string().min(12).max(128),
});

export const loginSchema = registerSchema.pick({ email: true, password: true });
export const resendVerificationSchema = z.object({
  email: registerSchema.shape.email,
  verificationId: z.uuid(),
});
export const verifyEmailSchema = resendVerificationSchema.extend({
  code: z.string().regex(/^\d{6}$/),
});
