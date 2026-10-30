import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { BookingsManager } from '@/features/bookings/components/BookingsManager';
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const bookingId = Array.isArray(query.bookingId)
    ? query.bookingId[0]
    : query.bookingId;
  if (bookingId) {
    const params = new URLSearchParams();
    for (const [name, value] of Object.entries(query)) {
      if (name === 'bookingId' || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value])
        params.append(name, item);
    }
    redirect(
      '/' +
        (await getLocale()) +
        '/dashboard/bookings/' +
        encodeURIComponent(bookingId) +
        (params.size ? '?' + params.toString() : ''),
    );
  }
  return <BookingsManager />;
}
