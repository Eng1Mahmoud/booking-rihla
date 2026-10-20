import 'server-only';
import { requireCurrentUser } from '@/features/auth/api/auth.queries';
import { apiFetch } from '@/shared/lib/apiFetch';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Booking } from '../types/booking';

export async function getBookings(offset: number) {
  await requireCurrentUser();
  return unwrapApiResult(
    await apiFetch<{
      items: Booking[];
      pagination: { limit: number; offset: number };
    }>('bookings?limit=20&offset=' + offset),
  );
}
