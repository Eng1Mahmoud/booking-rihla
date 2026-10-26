'use server';
import { z } from 'zod';
import { apiFetch } from '@/shared/lib/api';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readWindowPage } from '@/shared/lib/readWindowPage';
import { userSchema } from '@/features/users/schemas/userSchema';
import {
  administratorFiltersSchema,
  type AdministratorFilters,
} from '../schemas/administratorSchema';
export async function getAdministratorsAction(
  input: AdministratorFilters & { limit: number; offset: number },
) {
  const parsed = await parseSchema(
    administratorFiltersSchema.extend({
      limit: z.number().int().min(1).max(99),
      offset: z.number().int().min(0).max(100000),
    }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  const { limit, offset, ...filters } = parsed.data;
  return readWindowPage('admin/admins', { limit, offset }, userSchema, filters);
}

export async function setAdministratorStatusAction(input: {
  id: string;
  isActive: boolean;
}) {
  const parsed = await parseSchema(
    z.strictObject({ id: z.uuid(), isActive: z.boolean() }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  return apiFetch('admin/admins/' + parsed.data.id + '/status', {
    method: 'PATCH',
    body: { isActive: parsed.data.isActive },
  });
}
export async function setAdministratorRoleAction(input: {
  id: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}) {
  const parsed = await parseSchema(
    z.strictObject({
      id: z.uuid(),
      role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']),
    }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess(['SUPER_ADMIN']);
  if (!access.success) return access;
  return apiFetch('admin/admins/' + parsed.data.id + '/role', {
    method: 'PATCH',
    body: { role: parsed.data.role },
  });
}
