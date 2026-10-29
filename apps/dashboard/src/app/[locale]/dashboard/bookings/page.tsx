import { BookingsManager } from '@/features/bookings';
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tripId?: string; bookingId?: string }>;
}) {
  const query = await searchParams;
  return (
    <BookingsManager
      tripId={typeof query.tripId === 'string' ? query.tripId : ''}
      bookingId={typeof query.bookingId === 'string' ? query.bookingId : ''}
    />
  );
}
