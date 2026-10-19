import { apiGet } from '@/shared/lib/server/backend';
import type { Trip, SeatList } from '@/features/trips/types/trip';
import type { Search } from '@/features/trips/schemas/searchSchema';
export type City = { id: string; nameAr: string; nameEn: string };
export type Station = City & { cityId: string };
async function listCatalog<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; offset <= 100000; offset += 100) {
    const page = (
      await apiGet<{ data: T[] }>(path + '?limit=100&offset=' + offset)
    ).data;
    rows.push(...page);
    if (page.length < 100) return rows;
  }
  throw new Error('Catalog pagination limit reached');
}
export async function getSearchCatalog() {
  const [cities, stations] = await Promise.all([
    listCatalog<City>('cities'),
    listCatalog<Station>('stations'),
  ]);
  return { cities, stations };
}

export async function searchTrips(search: Search): Promise<Trip[]> {
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
  return (await apiGet<{ data: Trip[] }>('trips/search?' + query)).data;
}
export async function getTrip(id: string): Promise<Trip> {
  return (await apiGet<{ data: Trip }>('trips/' + id + '/details')).data;
}
export async function getSeats(id: string): Promise<SeatList> {
  return (await apiGet<{ data: SeatList }>('trips/' + id + '/seats')).data;
}
