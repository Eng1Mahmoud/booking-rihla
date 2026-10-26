'use server';
import { z } from 'zod';
import { checkStaffAccess } from '@/features/auth/lib/access.server';
import { parseSchema } from '@/shared/lib/parseSchema';
import { readWindowPage, readRecord } from '@/shared/lib/readWindowPage';
import {
  bookingSchema,
  bookingDetailSchema,
  bookingListSchema,
  type BookingFilters,
} from '../schemas/bookingSchema';
export async function getBookingsAction(
  input: BookingFilters & { limit: number; offset: number },
) {
  const parsed = await parseSchema(bookingListSchema, input);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  const { limit, offset, ...filters } = parsed.data;
  return readWindowPage(
    'admin/bookings',
    { limit, offset },
    bookingSchema,
    filters,
  );
}
export async function getBookingAction(id: string) {
  const parsed = await parseSchema(z.uuid(), id);
  if (!parsed.success) return parsed.error;
  const access = await checkStaffAccess();
  if (!access.success) return access;
  return readRecord('admin/bookings/' + parsed.data, bookingDetailSchema);
}
