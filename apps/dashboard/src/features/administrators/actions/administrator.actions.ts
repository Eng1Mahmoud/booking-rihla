'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ManagedUser } from '@/features/users/schemas/userSchema';
import type { AdministratorFilters } from '../schemas/administratorSchema';

export async function getAdministratorsAction(
  input: AdministratorFilters & { limit: number; offset: number },
) {
  const { limit, offset, ...filters } = input;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  return apiFetch<{ items: ManagedUser[]; total: number }>(
    'admin/admins?' + params,
  );
}

export async function setAdministratorStatusAction(input: {
  id: string;
  isActive: boolean;
}) {
  return apiFetch('admin/admins/' + input.id + '/status', {
    method: 'PATCH',
    body: { isActive: input.isActive },
  });
}

export async function setAdministratorRoleAction(input: {
  id: string;
  role: 'USER' | 'STAFF' | 'ADMIN' | 'SUPER_ADMIN';
}) {
  return apiFetch('admin/admins/' + input.id + '/role', {
    method: 'PATCH',
    body: { role: input.role },
  });
}
