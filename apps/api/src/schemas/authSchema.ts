import { z } from 'zod';
const email = z.string().trim().toLowerCase().pipe(z.email().max(254));
export const registerSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email,
  phone: z
    .string()
    .transform((value) =>
      value
        .replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
        .trim(),
    )
    .pipe(
      z.string().regex(/^\+[1-9]\d{7,14}$/, 'Use international phone format'),
    ),
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 512),
  language: z.enum(['ar', 'en']).default('ar'),
});
export const resendVerificationSchema = z.strictObject({
  email,
  verificationId: z.uuid(),
});
export const verifyEmailSchema = z.strictObject({
  email,
  verificationId: z.uuid(),
  code: z.string().regex(/^\d{6}$/),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const updateProfileSchema = registerSchema.pick({
  name: true,
  phone: true,
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const loginSchema = registerSchema.pick({ email: true, password: true });
export const emptySessionSchema = z.strictObject({}).default({});
export type LoginInput = z.infer<typeof loginSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const userRoleSchema = z.enum([
  'USER',
  'STAFF',
  'ADMIN',
  'SUPER_ADMIN',
]);
export type UserRole = z.infer<typeof userRoleSchema>;
