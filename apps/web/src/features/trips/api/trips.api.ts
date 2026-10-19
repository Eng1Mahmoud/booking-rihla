import { apiClient } from '@/shared/lib/apiClient';
import type { Trip, SeatList } from '@/features/trips/types/trip';
import type { Search } from '@/features/trips/schemas/searchSchema';
export type City = { id: string; nameAr: string; nameEn: string };
export type Station = City & { cityId: string };
async function listCatalog<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = (
      await apiClient.get<{ data: T[] }>(path + '?limit=100&offset=' + offset)
    ).data;
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
    return (await apiClient.get<{ data: Trip[] }>('trips/search?' + query))
      .data;
  },
  details: async (id: string): Promise<Trip> => {
    return (await apiClient.get<{ data: Trip }>('trips/' + id + '/details'))
      .data;
  },
  seats: async (id: string, signal?: AbortSignal): Promise<SeatList> => {
    return (
      await apiClient.get<{ data: SeatList }>('trips/' + id + '/seats', {
        signal,
      })
    ).data;
  },
};
