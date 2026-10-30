import { BookingsManager } from '@/features/bookings/components/BookingsManager';
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const query = await searchParams;
  return (
    <BookingsManager
      bookingId={typeof query.bookingId === 'string' ? query.bookingId : ''}
    />
  );
}
