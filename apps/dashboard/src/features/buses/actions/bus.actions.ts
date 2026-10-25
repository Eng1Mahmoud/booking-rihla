'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import { readListOptions } from '@/shared/lib/readListOptions';
import type { ListPage } from '@/shared/schemas/listSchema';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { busTypeSchema } from '@/features/bus-types/schemas/busTypeSchema';
import { amenitySchema } from '@/features/amenities/schemas/amenitySchema';
import {
  busSchema,
  busListQuerySchema,
  saveBusSchema,
  busIdSchema,
  type BusInput,
  type BusListQuery,
} from '../schemas/busSchema';
import type { Bus, BusOptions } from '../types/bus';
export async function getBusOptionsAction(): Promise<ApiResult<BusOptions>> {
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const [types, amenities] = await Promise.all([
    readListOptions('admin/bus-types', busTypeSchema),
    readListOptions('admin/amenities', amenitySchema),
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
  const parsed = await parseSchema(busListQuerySchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListPage('admin/buses', parsed.data, busSchema, {
    busTypeId: parsed.data.busTypeId,
    isActive: parsed.data.isActive,
  });
}
export async function saveBusAction(input: BusInput & { id?: string }) {
  const parsed = await parseSchema(saveBusSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<Bus>(id ? 'buses/' + id : 'buses', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteBusAction(id: string) {
  const parsed = await parseSchema(busIdSchema, id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('buses/' + parsed.data, { method: 'DELETE' });
}
