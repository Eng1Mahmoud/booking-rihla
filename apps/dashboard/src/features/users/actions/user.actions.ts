'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ManagedUser, UserFilters } from '../schemas/userSchema';

export async function getUsersAction(
  input: UserFilters & { limit: number; offset: number },
) {
  const { limit, offset, ...filters } = input;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  return apiFetch<{ items: ManagedUser[]; total: number }>(
    'admin/users?' + params,
  );
}

export async function setUserStatusAction(input: {
  id: string;
  isActive: boolean;
}) {
  return apiFetch('admin/users/' + input.id + '/status', {
    method: 'PATCH',
    body: { isActive: input.isActive },
  });
}
