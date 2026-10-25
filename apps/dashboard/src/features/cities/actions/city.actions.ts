'use server';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import {
  listQuerySchema,
  type ListPage,
  type ListQuery,
} from '@/shared/schemas/listSchema';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import {
  cityRowSchema,
  cityIdSchema,
  saveCitySchema,
  citySchema,
  type CityInput,
} from '../schemas/citySchema';
import type { City, CityRow } from '../types/city';

// City pickers are independent of table pages; never return partial options.
async function listCityOptions(): Promise<ApiResult<City[]>> {
  const locale = await getLocale();
  const items: City[] = [];
  const pageSchema = z.object({ items: z.array(citySchema).max(100) });
  for (let offset = 0; offset <= 100000; offset += 100) {
    const result = await apiFetch<unknown>('cities?limit=100&offset=' + offset);
    if (!result.success) return { ...result, data: undefined };
    const parsed = pageSchema.safeParse(result.data);
    if (!parsed.success) return apiFailure(502, 'UPSTREAM_ERROR', locale);
    items.push(...parsed.data.items);
    if (parsed.data.items.length < 100) return { ...result, data: items };
  }
  return apiFailure(502, 'UPSTREAM_ERROR', locale);
}

export async function getCityOptionsAction(): Promise<ApiResult<City[]>> {
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return listCityOptions();
}

export async function getCitiesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<CityRow>>> {
  const parsed = await parseSchema(listQuerySchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListPage('admin/cities', parsed.data, cityRowSchema);
}

export async function saveCityAction(input: CityInput & { id?: string }) {
  const parsed = await parseSchema(saveCitySchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<City>(id ? 'cities/' + id : 'cities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteCityAction(id: string) {
  const parsed = await parseSchema(cityIdSchema, id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('cities/' + parsed.data, { method: 'DELETE' });
}
