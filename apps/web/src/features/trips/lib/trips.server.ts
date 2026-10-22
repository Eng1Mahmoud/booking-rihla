import 'server-only';
import { fetchWithAccessToken } from '@/features/auth/lib/auth.server';
import type { ApiResult } from '@/shared/lib/apiResult';
import type { Trip, City, Station, TripCatalog } from '../types/trip';
import type { Search } from '../schemas/searchSchema';

async function listCatalog<T>(path: string): Promise<ApiResult<T[]>> {
  const items: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = await fetchWithAccessToken<{ items: T[] }>(
      path + '?limit=100&offset=' + offset,
    );
    if (!page.success || !page.data) return { ...page, data: undefined };
    items.push(...page.data.items);
    if (page.data.items.length < 100) return { ...page, data: items };
  }
  return {
    success: false,
    status: 502,
    code: 'UPSTREAM_ERROR',
    message: 'Catalog pagination limit reached',
  };
}
export async function getTripCatalog(): Promise<ApiResult<TripCatalog>> {
  const [cities, stations] = await Promise.all([
    listCatalog<City>('cities'),
    listCatalog<Station>('stations'),
  ]);
  if (!cities.success || !cities.data) return { ...cities, data: undefined };
  if (!stations.success || !stations.data)
    return { ...stations, data: undefined };
  return { ...cities, data: { cities: cities.data, stations: stations.data } };
}
export function getTrips(search: Search) {
  const query = new URLSearchParams({
    travelDate: search.travelDate,
    limit: '21',
    offset: String(search.offset),
  });
  for (const key of [
    'originCityId',
    'originStationId',
    'destinationCityId',
    'destinationStationId',
  ] as const)
    if (search[key]) query.set(key, search[key]);
  return fetchWithAccessToken<{ items: Trip[] }>('trips/search?' + query);
}
