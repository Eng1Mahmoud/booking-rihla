import { z } from 'zod';
export const administratorFiltersSchema = z.object({
  email: z.union([z.literal(''), z.email()]),
  role: z.enum(['', 'STAFF', 'ADMIN', 'SUPER_ADMIN']),
  isActive: z.enum(['', 'true', 'false']),
});
export const administratorRoleSchema = z.object({
  id: z.uuid(),
  role: z.enum(['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN']),
});
export type AdministratorFilters = z.infer<typeof administratorFiltersSchema>;
