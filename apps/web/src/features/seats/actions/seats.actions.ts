'use server';
import { z } from 'zod';
import { readApi } from '@/features/auth/lib/auth.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import type { SeatList } from '@/features/trips/types/trip';
export async function getTripSeatsAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  return readApi<SeatList>('trips/' + parsed.data + '/seats');
}
