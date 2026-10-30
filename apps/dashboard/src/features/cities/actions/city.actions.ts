'use server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
import { getLocale } from 'next-intl/server';
import type { ListPage } from '@/shared/types/list';
import type { CityInput } from '../schemas/citySchema';
import type { City, CityRow } from '../types/city';

export async function getCityOptionsAction(): Promise<ApiResult<City[]>> {
  const items: CityRow[] = [];
  const locale = await getLocale();
  for (let offset = 0; offset <= 100000; offset += 100) {
    const params = new URLSearchParams({
      search: '',
      locale,
      limit: '100',
      offset: String(offset),
    });
    const page = await apiFetch<{ items: CityRow[]; total: number }>(
      'admin/cities?' + params,
    );
    if (!page.success || !page.data) return { ...page, data: undefined };
    items.push(...page.data.items);
    if (items.length >= page.data.total || page.data.items.length < 100)
      return { ...page, data: items };
  }
  return apiFailure(502, 'UPSTREAM_ERROR', locale);
}

export async function getCitiesAction(query: string) {
  return apiFetch<ListPage<CityRow>>('admin/cities?' + query);
}

export async function saveCityAction(input: CityInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<City>(id ? 'cities/' + id : 'cities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteCityAction(id: string) {
  return apiFetch<void>('cities/' + id, { method: 'DELETE' });
}
