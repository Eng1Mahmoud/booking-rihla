'use server';
import { apiFetch } from '@/shared/lib/api';
import type {
  Booking,
  BookingDetail,
  BookingFilters,
} from '../schemas/bookingSchema';

export async function getBookingsAction(
  input: BookingFilters & { limit: number; offset: number },
) {
  const { limit, offset, ...filters } = input;
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [key, value] of Object.entries(filters))
    if (value) params.set(key, value);
  return apiFetch<{ items: Booking[]; total: number }>(
    'admin/bookings?' + params,
  );
}

export async function getBookingAction(id: string) {
  return apiFetch<BookingDetail>('admin/bookings/' + id);
}
