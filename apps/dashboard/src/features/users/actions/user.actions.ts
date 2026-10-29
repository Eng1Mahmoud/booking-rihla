'use server';
import { z } from 'zod';
import { apiFetch } from '@/shared/lib/api';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import {
  userSchema,
  userFiltersSchema,
  type UserFilters,
} from '../schemas/userSchema';
export async function getUsersAction(
  input: UserFilters & { limit: number; offset: number },
) {
  const parsed = await parseSchema(
    userFiltersSchema.extend({
      limit: z.number().int().min(1).max(100),
      offset: z.number().int().min(0).max(100000),
    }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { limit, offset, ...filters } = parsed.data;
  return readListPage('admin/users', { limit, offset }, userSchema, filters);
}

export async function setUserStatusAction(input: {
  id: string;
  isActive: boolean;
}) {
  const parsed = await parseSchema(
    z.strictObject({ id: z.uuid(), isActive: z.boolean() }),
    input,
  );
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch('admin/users/' + parsed.data.id + '/status', {
    method: 'PATCH',
    body: { isActive: parsed.data.isActive },
  });
}
