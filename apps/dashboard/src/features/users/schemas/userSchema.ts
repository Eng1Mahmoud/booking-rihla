import { z } from 'zod';
export const userRoles = ['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'] as const;
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(userRoles),
  language: z.string(),
  isActive: z.boolean(),
  emailVerifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type ManagedUser = z.infer<typeof userSchema>;
export type UserFilters = {
  email: string;
  phone: string;
  isActive: '' | 'true' | 'false';
};
