import 'server-only';
import { apiFetch } from '@/shared/lib/apiFetch';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Trip, SeatList } from '@/features/trips/types/trip';
import type { Search } from '@/features/trips/schemas/searchSchema';
export type City = { id: string; nameAr: string; nameEn: string };
export type Station = City & { cityId: string };
async function listCatalog<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = unwrapApiResult(
      await apiFetch<{ items: T[] }>(path + '?limit=100&offset=' + offset, {
        auth: false,
      }),
    ).items;
    rows.push(...page);
    if (page.length < 100) return rows;
  }
  throw new Error('Catalog pagination limit reached');
}
export const tripsApi = {
  catalog: async () => {
    const [cities, stations] = await Promise.all([
      listCatalog<City>('cities'),
      listCatalog<Station>('stations'),
    ]);
    return { cities, stations };
  },

  search: async (search: Search): Promise<Trip[]> => {
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
    return unwrapApiResult(
      await apiFetch<{ items: Trip[] }>('trips/search?' + query, {
        auth: false,
      }),
    ).items;
  },
  details: async (id: string): Promise<Trip> => {
    return unwrapApiResult(
      await apiFetch<Trip>('trips/' + id + '/details', { auth: false }),
    );
  },
  seats: async (id: string, signal?: AbortSignal): Promise<SeatList> => {
    return unwrapApiResult(
      await apiFetch<SeatList>('trips/' + id + '/seats', {
        auth: false,
        signal,
      }),
    );
  },
};
