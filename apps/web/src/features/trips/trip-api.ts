import { apiGet } from '@/lib/api';
import type { Trip, SeatList } from './types';
import type { Search } from './search';
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
