'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { getLocale } from 'next-intl/server';
import type { ListPage, ListQuery } from '@/shared/schemas/listSchema';
import type { BusTypeInput } from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export async function getBusTypesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<BusType>>> {
  const params = new URLSearchParams({
    search: input.search,
    locale: await getLocale(),
    limit: String(input.limit),
    offset: String(input.offset),
  });
  return apiFetch<ListPage<BusType>>('admin/bus-types?' + params);
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
