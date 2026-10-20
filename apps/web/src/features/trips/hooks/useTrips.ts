'use client';
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
    queryKey: ['trips', 'catalog', locale],
    queryFn: () => invokeAction(getTripCatalogAction),
    initialData: initial,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
export function useTripSearch(search: Search, initial: Trip[]) {
  const locale = useLocale();
  return useQuery({
    queryKey: ['trips', 'search', locale, search],
    queryFn: () => invokeAction(() => getTripsAction(search)),
    initialData: { items: initial },
    staleTime: 0,
    retry: false,
  });
}
export function useTripDetails(initial: Trip) {
  const locale = useLocale();
  return useQuery({
    queryKey: ['trips', 'detail', locale, initial.id],
    queryFn: () => invokeAction(() => getTripDetailsAction(initial.id)),
    initialData: initial,
    staleTime: 0,
    retry: false,
  });
}
