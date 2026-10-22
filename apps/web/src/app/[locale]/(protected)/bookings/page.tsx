import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BookingHistory } from '@/features/bookings/components/BookingHistory';
import { requireCurrentUser, readApi } from '@/features/auth/lib/auth.server';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Booking } from '@/features/bookings/types/booking';
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
    const user = await requireCurrentUser();
    const page = unwrapApiResult(
      await readApi<{ items: Booking[] }>('bookings?limit=20&offset=' + offset),
    );
    result = { ...page, userId: user.id };
  } catch (error) {
    return (
      <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
        <ReadError message={errorMessage(error, await getLocale())} />
      </div>
    );
  }
  return (
    <div className="mx-auto w-[calc(100%-28px)] max-w-[1180px] md:w-[calc(100%-40px)] pt-6 pb-10 md:pt-9 md:pb-16">
      <BookingHistory
        key={result.userId + ':' + offset}
        bookings={result.items}
        userId={result.userId}
        offset={offset}
      />
    </div>
  );
}
