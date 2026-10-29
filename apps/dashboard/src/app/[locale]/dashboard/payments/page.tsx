import { PaymentsManager } from '@/features/payments/components/PaymentsManager';
export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ bookingId?: string }>;
}) {
  const query = await searchParams;
  return (
    <PaymentsManager
      bookingId={typeof query.bookingId === 'string' ? query.bookingId : ''}
    />
  );
}
