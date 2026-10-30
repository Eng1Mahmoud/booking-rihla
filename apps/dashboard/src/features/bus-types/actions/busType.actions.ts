'use server';
import { apiFetch } from '@/shared/lib/api';

import type { ListPage } from '@/shared/types/list';
import type { BusTypeInput } from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export async function getBusTypesAction(query: string) {
  return apiFetch<ListPage<BusType>>('admin/bus-types?' + query);
}

export async function saveBusTypeAction(input: BusTypeInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<BusType>(id ? 'bus-types/' + id : 'bus-types', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteBusTypeAction(id: string) {
  return apiFetch<void>('bus-types/' + id, { method: 'DELETE' });
}
