import { notFound } from 'next/navigation';
import { PaymentResult } from '@/features/bookings/components/PaymentResult';
export const metadata = {
  referrer: 'no-referrer' as const,
  robots: { index: false, follow: false },
};
export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { bookingId } = await searchParams;
  if (
    bookingId !== undefined &&
    (typeof bookingId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        bookingId,
      ))
  )
    notFound();
  // Provider query flags never determine payment status.
  return (
    <div className="container-shell page-space">
      <PaymentResult bookingId={bookingId} />
    </div>
  );
}
