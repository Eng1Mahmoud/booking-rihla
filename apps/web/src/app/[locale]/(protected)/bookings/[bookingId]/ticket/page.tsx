import { notFound } from 'next/navigation';
import { TicketView } from '@/features/tickets/components/TicketView';
export default async function TicketPage({
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
      <TicketView bookingId={bookingId} />
    </div>
  );
}
