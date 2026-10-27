import { z } from 'zod';

export const userRoleSchema = z.enum([
  'USER',
  'STAFF',
  'ADMIN',
  'SUPER_ADMIN',
]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,15}$/),
  password: z.string().min(8).max(128),
  language: z.enum(['ar', 'en']).default('ar'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email().max(254),
});
