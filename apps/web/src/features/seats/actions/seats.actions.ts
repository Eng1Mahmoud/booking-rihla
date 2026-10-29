'use server';
import { apiFetch } from '@/shared/lib/api';
import { parseSchema } from '@/shared/lib/parseSchema';
import { z } from 'zod';
import type { SeatList } from '@/features/trips/types/trip';

export async function getTripSeatsAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  return apiFetch<SeatList>('trips/' + parsed.data + '/seats');
}
