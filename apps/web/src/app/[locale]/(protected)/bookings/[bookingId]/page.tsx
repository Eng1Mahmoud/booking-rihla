import { notFound } from 'next/navigation';
import { BookingDetail } from '@/features/bookings/components/BookingDetail';
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
  return (
    <div className="container-shell page-space">
      <BookingDetail bookingId={bookingId} />
    </div>
  );
}
