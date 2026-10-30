import { BookingDetailsPage } from '@/features/bookings/components/BookingDetails';
export default async function DetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingDetailsPage key={id} id={id} />;
}
