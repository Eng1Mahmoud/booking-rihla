import { z } from 'zod';
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
  language: z.string(),
  isActive: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export const userFiltersSchema = z.object({
  email: z.union([z.literal(''), z.email()]),
  phone: z.union([z.literal(''), z.string().regex(/^\+[1-9]\d{7,14}$/)]),
  isActive: z.enum(['', 'true', 'false']),
});
export type ManagedUser = z.infer<typeof userSchema>;
export type UserFilters = z.infer<typeof userFiltersSchema>;
