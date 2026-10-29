'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib';
import { getLocale } from 'next-intl/server';
import type { ListPage, ListQuery } from '@/shared/types';
import type { AmenityInput } from '../schemas/amenitySchema';
import type { Amenity } from '../types/amenity';

export async function getAmenitiesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<Amenity>>> {
  const params = new URLSearchParams({
    search: input.search,
    locale: await getLocale(),
    limit: String(input.limit),
    offset: String(input.offset),
  });
  return apiFetch<ListPage<Amenity>>('admin/amenities?' + params);
}

export async function saveAmenityAction(input: AmenityInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Amenity>(id ? 'amenities/' + id : 'amenities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteAmenityAction(id: string) {
  return apiFetch<void>('amenities/' + id, { method: 'DELETE' });
}
