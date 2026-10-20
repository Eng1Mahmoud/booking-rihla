'use server';
import { z } from 'zod';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { searchSchema, type Search } from '../schemas/searchSchema';
import { readTripCatalog, readTrips } from '../lib/trips.server';
import type { Trip } from '../types/trip';

export async function getTripCatalogAction() {
  return readTripCatalog('action');
}
export async function getTripsAction(input: Search) {
  const parsed = await parseSchema(searchSchema, {
    ...input,
    offset: String(input?.offset ?? 0),
  });
  if (!parsed.success) return parsed.error;
  return readTrips(parsed.data, 'action');
}
export async function getTripDetailsAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  return apiFetch<Trip>('trips/' + parsed.data + '/details', {
    context: 'action',
  });
}
