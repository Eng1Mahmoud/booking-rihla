'use server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib';
import { getLocale } from 'next-intl/server';
import type { ListPage } from '@/shared/types';
import type { BusType } from '@/features/bus-types';
import type { Amenity } from '@/features/amenities';
import type { BusInput, BusListQuery } from '../schemas/busSchema';
import type { Bus, BusOptions } from '../types/bus';
export async function getBusOptionsAction(): Promise<ApiResult<BusOptions>> {
  async function listAll<T>(path: string): Promise<ApiResult<T[]>> {
    const items: T[] = [];
    const locale = await getLocale();
    for (let offset = 0; offset <= 100000; offset += 100) {
      const params = new URLSearchParams({
        search: '',
        locale,
        limit: '100',
        offset: String(offset),
      });
      const page = await apiFetch<{ items: T[]; total: number }>(
        path + '?' + params,
      );
      if (!page.success || !page.data) return { ...page, data: undefined };
      items.push(...page.data.items);
      if (items.length >= page.data.total || page.data.items.length < 100)
        return { ...page, data: items };
    }
    return apiFailure(502, 'UPSTREAM_ERROR', locale);
  }
  const [types, amenities] = await Promise.all([
    listAll<BusType>('admin/bus-types'),
    listAll<Amenity>('admin/amenities'),
  ]);
  if (!types.success || !types.data) return { ...types, data: undefined };
  if (!amenities.success || !amenities.data)
    return { ...amenities, data: undefined };
  return {
    ...types,
    data: { busTypes: types.data, amenities: amenities.data },
  };
}
export async function getBusesAction(
  input: BusListQuery,
): Promise<ApiResult<ListPage<Bus>>> {
  const params = new URLSearchParams({
    search: input.search,
    locale: await getLocale(),
    limit: String(input.limit),
    offset: String(input.offset),
  });
  for (const key of ['busTypeId', 'isActive'] as const)
    if (input[key]) params.set(key, input[key]);
  return apiFetch<ListPage<Bus>>('admin/buses?' + params);
}
export async function saveBusAction(input: BusInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Bus>(id ? 'buses/' + id : 'buses', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteBusAction(id: string) {
  return apiFetch<void>('buses/' + id, { method: 'DELETE' });
}
