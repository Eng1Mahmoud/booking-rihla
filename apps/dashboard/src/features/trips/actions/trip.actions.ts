'use server';
import { apiFetch } from '@/shared/lib/api';
import { apiFailure, type ApiResult } from '@/shared/lib/apiResult';
import { getLocale } from 'next-intl/server';
import type { Route } from '@/features/routes/schemas/routeSchema';
import type { StationRow } from '@/features/stations/types/station';
import type { Bus } from '@/features/buses/types/bus';
import type {
  Trip,
  TripInput,
  TripListQuery,
  BatchInput,
  BatchPreview,
} from '../schemas/tripSchema';
export async function getTripOptionsAction() {
  async function listAll<T>(
    path: string,
    search: boolean,
  ): Promise<ApiResult<T[]>> {
    const items: T[] = [];
    const locale = await getLocale();
    for (let offset = 0; offset <= 100000; offset += 100) {
      const params = new URLSearchParams({
        limit: '100',
        offset: String(offset),
      });
      if (search) {
        params.set('search', '');
        params.set('locale', locale);
      }
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
  const [routes, buses, stations] = await Promise.all([
    listAll<Route>('routes', false),
    listAll<Bus>('admin/buses', true),
    listAll<StationRow>('admin/stations', true),
  ]);
  if (!routes.success || !routes.data) return { ...routes, data: undefined };
  if (!buses.success || !buses.data) return { ...buses, data: undefined };
  if (!stations.success || !stations.data)
    return { ...stations, data: undefined };
  return {
    ...routes,
    data: { routes: routes.data, buses: buses.data, stations: stations.data },
  };
}
export async function getTripsAction(input: TripListQuery) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  });
  for (const key of ['routeId', 'busId', 'status'] as const)
    if (input[key]) params.set(key, input[key]);
  return apiFetch<{ items: Trip[]; total: number }>('trips?' + params);
}
export async function saveTripAction(input: TripInput & { id?: string }) {
  const { id, ...body } = input;
  return apiFetch<Trip>(id ? 'trips/' + id : 'trips', {
    method: id ? 'PATCH' : 'POST',
    body,
  });
}
export async function deleteTripAction(id: string) {
  return apiFetch<void>('trips/' + id, { method: 'DELETE' });
}
export async function previewTripBatchAction(input: BatchInput) {
  return apiFetch<BatchPreview>('trips/batch/preview', {
    method: 'POST',
    body: input,
  });
}
export async function createTripBatchAction(input: BatchInput) {
  const result = await apiFetch<{ totalTrips: number; trips: Trip[] }>(
    'trips/batch',
    { method: 'POST', body: input },
  );
  if (!result.success || !result.data) return { ...result, data: undefined };
  return { ...result, data: { totalTrips: result.data.totalTrips } };
}
export async function cancelTripAction(input: { id: string; reason: string }) {
  return apiFetch('admin/trips/' + input.id + '/cancel', {
    method: 'POST',
    body: { reason: input.reason },
  });
}
