'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ManagedUser } from '@/features/users/schemas/userSchema';

export async function getAdministratorsAction(query: string) {
  return apiFetch<{ items: ManagedUser[]; total: number }>(
    'admin/admins?' + query,
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

export async function getAdministratorAction(id: string) {
  return apiFetch<ManagedUser>('admin/admins/' + encodeURIComponent(id));
}
