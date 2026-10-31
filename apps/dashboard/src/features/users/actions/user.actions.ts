'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ManagedUser } from '../schemas/userSchema';

export async function getUsersAction(query: string) {
  return apiFetch<{ items: ManagedUser[]; total: number }>(
    'admin/users?' + query,
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
