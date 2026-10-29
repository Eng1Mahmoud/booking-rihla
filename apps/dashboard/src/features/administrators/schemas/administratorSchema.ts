import { z } from 'zod';
export const administratorRoleSchema = z.object({
  id: z.uuid(),
  role: z.enum(['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN']),
});
export type AdministratorFilters = {
  email: string;
  role: '' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: '' | 'true' | 'false';
};
