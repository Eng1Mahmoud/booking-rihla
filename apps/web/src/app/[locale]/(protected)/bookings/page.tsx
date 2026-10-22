import { getLocale } from 'next-intl/server';
import { AccountLayout } from '@/features/account/components/AccountLayout';
import { notFound } from 'next/navigation';
import { BookingHistory } from '@/features/bookings/components/BookingHistory';
import {
  requireSignedInUser,
  fetchWithAccessToken,
} from '@/features/auth/lib/auth.server';
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
    const user = await requireSignedInUser();
    const page = unwrapApiResult(
      await fetchWithAccessToken<{ items: Booking[] }>(
        'bookings?limit=20&offset=' + offset,
      ),
    );
    result = { ...page, userId: user.id };
  } catch (error) {
    return (
      <AccountLayout>
        <ReadError message={errorMessage(error, await getLocale())} />
      </AccountLayout>
    );
  }
  return (
    <AccountLayout>
      <BookingHistory
        key={result.userId + ':' + offset}
        bookings={result.items}
        userId={result.userId}
        offset={offset}
      />
    </AccountLayout>
  );
}
