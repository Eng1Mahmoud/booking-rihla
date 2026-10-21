'use server';
import { z } from 'zod';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { searchSchema, type Search } from '../schemas/searchSchema';
import { getTripCatalog, getTrips } from '../lib/trips.server';
import type { Trip } from '../types/trip';

export async function getTripCatalogAction() {
  return getTripCatalog('action');
}
export async function getTripsAction(input: Search) {
  const parsed = await parseSchema(searchSchema, {
    ...input,
    offset: String(input?.offset ?? 0),
  });
  if (!parsed.success) return parsed.error;
  return getTrips(parsed.data, 'action');
}
export async function getTripDetailsAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  return apiFetch<Trip>('trips/' + parsed.data + '/details', {
    context: 'action',
  });
}
