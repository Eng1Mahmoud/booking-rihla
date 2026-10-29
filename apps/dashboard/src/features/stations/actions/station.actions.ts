'use server';
import { apiFetch } from '@/shared/lib/api';
import type { ApiResult } from '@/shared/lib';
import { getLocale } from 'next-intl/server';
import type { ListPage } from '@/shared/schemas';
import type { StationListQuery, StationInput } from '../schemas/stationSchema';
import type { Station, StationRow } from '../types/station';

export async function getStationsAction(
  input: StationListQuery,
): Promise<ApiResult<ListPage<StationRow>>> {
  const params = new URLSearchParams({
    search: input.search,
    locale: await getLocale(),
    limit: String(input.limit),
    offset: String(input.offset),
  });
  if (input.cityId) params.set('cityId', input.cityId);
  return apiFetch<ListPage<StationRow>>('admin/stations?' + params);
}

export async function saveStationAction(input: StationInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Station>(id ? 'stations/' + id : 'stations', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}

export async function deleteStationAction(id: string) {
  return apiFetch<void>('stations/' + id, { method: 'DELETE' });
}
