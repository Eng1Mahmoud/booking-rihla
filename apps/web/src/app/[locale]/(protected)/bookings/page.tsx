import { apiFetch } from '@/shared/lib/api';
import { getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AccountLayout } from '@/features/account/components/AccountLayout';
import { BookingHistory } from '@/features/bookings/components/BookingHistory';
import { bookingsListInputSchema } from '@/features/bookings/schemas/bookingSchema';
import type { BookingListPage } from '@/features/bookings/types/booking';
import { getSignedInUser } from '@/features/auth/lib/auth.server';
import {
  ApiError,
  getApiDataOrThrow,
  errorMessage,
} from '@/shared/lib/apiResult';
import { ReadError } from '@/shared/components/feedback/ReadError';

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; filter?: string }>;
}) {
  const { offset: raw = '0', filter = 'all' } = await searchParams;
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) notFound();
  const input = bookingsListInputSchema.safeParse({
    offset: Number(raw),
    filter,
  });
  if (!input.success) notFound();
  let initial, userId, readAt;
  try {
    const user = await getSignedInUser();
    if (!user) throw new ApiError(401, 'UNAUTHENTICATED');
    initial = getApiDataOrThrow(
      await apiFetch<BookingListPage>(
        'bookings?limit=20&offset=' +
          input.data.offset +
          '&filter=' +
          input.data.filter,
      ),
    );
    userId = user.id;
    readAt = Date.now();
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
        key={userId + ':' + input.data.filter + ':' + input.data.offset}
        initial={initial}
        userId={userId}
        readAt={readAt}
      />
    </AccountLayout>
  );
}
