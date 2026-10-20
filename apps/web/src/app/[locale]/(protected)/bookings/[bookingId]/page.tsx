import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { BookingDetail } from '@/features/bookings/components/BookingDetail';
import { getBookingDetails } from '@/features/bookings/lib/bookings.server';
import { ApiError, errorMessage } from '@/shared/lib/apiResult';
import { ReadError } from '@/shared/components/ReadError';
export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bookingId,
    )
  )
    notFound();
  let initial;
  try {
    initial = await getBookingDetails(bookingId);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'BOOKING_NOT_FOUND')
      notFound();
    return (
      <div className="container-shell page-space">
        <ReadError message={errorMessage(error, await getLocale())} />
      </div>
    );
  }
  return (
    <div className="container-shell page-space">
      <BookingDetail initial={initial} />
    </div>
  );
}
