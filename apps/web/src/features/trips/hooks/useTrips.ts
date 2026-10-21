'use client';
import { tripKeys } from './queryKeys';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  getTripCatalogAction,
  getTripsAction,
  getTripDetailsAction,
} from '../actions/trips.actions';
import type { Trip, TripCatalog } from '../types/trip';
import type { Search } from '../schemas/searchSchema';

export function useTripCatalog(initial?: TripCatalog) {
  const locale = useLocale();
  return useQuery({
    queryKey: tripKeys.catalog(locale),
    queryFn: () => invokeAction(getTripCatalogAction),
    initialData: initial,
    staleTime: 5 * 60 * 1000,
  });
}
export function useTripSearch(search: Search, initial: Trip[]) {
  const locale = useLocale();
  return useQuery({
    queryKey: tripKeys.search(locale, search),
    queryFn: () => invokeAction(() => getTripsAction(search)),
    initialData: { items: initial },
    staleTime: 0,
  });
}
export function useTripDetails(initial: Trip) {
  const locale = useLocale();
  return useQuery({
    queryKey: tripKeys.detail(locale, initial.id),
    queryFn: () => invokeAction(() => getTripDetailsAction(initial.id)),
    initialData: initial,
    staleTime: 0,
  });
}
