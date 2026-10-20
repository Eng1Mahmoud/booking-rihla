import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BookingHistory } from '@/features/bookings/components/BookingHistory';
import { getBookings } from '@/features/bookings/lib/bookings.server';
import { ReadError } from '@/shared/components/feedback/ReadError';
import { errorMessage } from '@/shared/lib/apiResult';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset: raw = '0' } = await searchParams;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw) || Number(raw) > 100000)
    notFound();
  const offset = Number(raw);
  let result;
  try {
    result = await getBookings(offset);
  } catch (error) {
    return (
      <div className="container-shell page-space">
        <ReadError message={errorMessage(error, await getLocale())} />
      </div>
    );
  }
  return (
    <div className="container-shell page-space">
      <BookingHistory
        key={result.userId + ':' + offset}
        bookings={result.items}
        userId={result.userId}
        offset={offset}
      />
    </div>
  );
}
