'use server';
import { z } from 'zod';
import { getLocale } from 'next-intl/server';
import { apiFetch } from '@/shared/lib/api';
import { validationError } from '@/shared/lib/apiResult';
import type { SeatList } from '@/features/trips/types/trip';
export async function getTripSeatsAction(id: string) {
  if (!z.uuid().safeParse(id).success)
    return validationError(await getLocale());
  return apiFetch<SeatList>('trips/' + id + '/seats', { context: 'action' });
}
