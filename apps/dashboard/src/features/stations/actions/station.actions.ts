'use server';
import { apiFetch } from '@/shared/lib/api';

import type { ListPage } from '@/shared/types/list';
import type { StationInput } from '../schemas/stationSchema';
import type { Station, StationRow } from '../types/station';

export async function getStationsAction(query: string) {
  return apiFetch<ListPage<StationRow>>('admin/stations?' + query);
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
