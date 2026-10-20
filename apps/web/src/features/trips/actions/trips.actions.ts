'use server';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { validationError } from '@/shared/lib/apiResult';
import { searchSchema, type Search } from '../schemas/searchSchema';
import { readTripCatalog, readTrips } from '../lib/trips.server';
import type { Trip } from '../types/trip';

export async function getTripCatalogAction() {
  return readTripCatalog('action');
}
export async function getTripsAction(input: Search) {
  const parsed = searchSchema.safeParse({
    ...input,
    offset: String(input?.offset ?? 0),
  });
  if (!parsed.success) return validationError(await getLocale());
  return readTrips(parsed.data, 'action');
}
export async function getTripDetailsAction(id: string) {
  if (!z.uuid().safeParse(id).success)
    return validationError(await getLocale());
  return apiFetch<Trip>('trips/' + id + '/details', { context: 'action' });
}
