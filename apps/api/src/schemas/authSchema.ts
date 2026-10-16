import { z } from 'zod';
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const registerSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email,
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, 'Use international phone format'),
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 512),
  language: z.enum(['ar', 'en']).default('ar'),
});
export const resendVerificationSchema = z.strictObject({ email });
export const verifyEmailSchema = z.strictObject({
  email,
  code: z.string().regex(/^\d{6}$/),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
