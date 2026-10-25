'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import {
  listQuerySchema,
  type ListPage,
  type ListQuery,
} from '@/shared/schemas/listSchema';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import {
  amenitySchema,
  amenityIdSchema,
  saveAmenitySchema,
  type AmenityInput,
} from '../schemas/amenitySchema';
import type { Amenity } from '../types/amenity';

export async function getAmenitiesAction(
  input: ListQuery,
): Promise<ApiResult<ListPage<Amenity>>> {
  const parsed = await parseSchema(listQuerySchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListPage('admin/amenities', parsed.data, amenitySchema);
}

export async function saveAmenityAction(input: AmenityInput & { id?: string }) {
  const parsed = await parseSchema(saveAmenitySchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<Amenity>(id ? 'amenities/' + id : 'amenities', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteAmenityAction(id: string) {
  const parsed = await parseSchema(amenityIdSchema, id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('amenities/' + parsed.data, { method: 'DELETE' });
}
