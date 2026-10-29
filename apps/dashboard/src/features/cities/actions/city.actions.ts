'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import { readListOptions } from '@/shared/lib/readListOptions';
import {
  listQuerySchema,
  type ListPage,
  type ListQuery,
} from '@/shared/schemas/listSchema';
import {
  cityRowSchema,
  cityIdSchema,
  saveCitySchema,
  type CityInput,
} from '../schemas/citySchema';
import type { City, CityRow } from '../types/city';

export async function getCityOptionsAction(): Promise<ApiResult<City[]>> {
  return readListOptions('admin/cities', cityRowSchema, '');
}

export async function getCitiesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<CityRow>>> {
  const parsed = await parseSchema(listQuerySchema, input);
  if (!parsed.success) return parsed.error;
  return readListPage('admin/cities', parsed.data, cityRowSchema);
}

export async function saveCityAction(input: CityInput & { id?: string }) {
  const parsed = await parseSchema(saveCitySchema, input);
  if (!parsed.success) return parsed.error;
  const { id, ...body } = parsed.data;
  return apiFetch<City>(id ? 'cities/' + id : 'cities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteCityAction(id: string) {
  const parsed = await parseSchema(cityIdSchema, id);
  if (!parsed.success) return parsed.error;
  return apiFetch<void>('cities/' + parsed.data, { method: 'DELETE' });
}
