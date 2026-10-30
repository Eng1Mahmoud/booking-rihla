'use server';
import { apiFetch } from '@/shared/lib/api';
import type { Booking, BookingDetail } from '../schemas/bookingSchema';

export async function getBookingsAction(query: string) {
  return apiFetch<{ items: Booking[]; total: number }>(
    'admin/bookings?' + query,
  );
}

export async function getBookingAction(id: string) {
  return apiFetch<BookingDetail>('admin/bookings/' + encodeURIComponent(id));
}
