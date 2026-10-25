'use server';
import { apiFetch } from '@/shared/lib/api';
import { type ApiResult } from '@/shared/lib/apiResult';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readListPage } from '@/shared/lib/readListPage';
import { type ListPage } from '@/shared/schemas/listSchema';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import {
  stationRowSchema,
  stationIdSchema,
  saveStationSchema,
  stationListSchema,
  type StationListQuery,
  type StationInput,
} from '../schemas/stationSchema';
import type { Station, StationRow } from '../types/station';

export async function getStationsAction(
  input: StationListQuery,
): Promise<ApiResult<ListPage<StationRow>>> {
  const parsed = await parseSchema(stationListSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readListPage('admin/stations', parsed.data, stationRowSchema, {
    cityId: parsed.data.cityId ?? '',
  });
}

export async function saveStationAction(input: StationInput & { id?: string }) {
  const parsed = await parseSchema(saveStationSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { id, ...body } = parsed.data;
  return apiFetch<Station>(id ? 'stations/' + id : 'stations', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteStationAction(id: string) {
  const parsed = await parseSchema(stationIdSchema, id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return apiFetch<void>('stations/' + parsed.data, { method: 'DELETE' });
}
