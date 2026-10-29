import { z } from 'zod';
import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { BookingDetail } from '@/features/bookings/components/BookingDetail';
import { getBookingDetails } from '@/features/bookings/lib/bookings.server';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { ReadError } from '@/shared/components/feedback/ReadError';
export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  if (!z.uuid().safeParse(bookingId).success) notFound();
  let initial;
  try {
    initial = await getBookingDetails(bookingId);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
      notFound();
    return (
      <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
        <ReadError message={errorMessage(error, await getLocale())} />
      </div>
    );
  }
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <BookingDetail initial={initial} />
    </div>
  );
}
