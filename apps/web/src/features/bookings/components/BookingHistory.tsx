'use client';
import { Button } from '@/shared/components/ui/button';
import { useLocale, useTranslations } from 'next-intl';
import { useBookings } from '../hooks/useBookings';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { errorMessage } from '@/shared/lib/apiResult';
import type { Booking } from '../types/booking';
import { Link } from '@/i18n/navigation';
import { displayName, formatDate, formatPrice } from '@/shared/lib/format';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';
export function BookingHistory({
  bookings: initial,
  userId,
  offset,
}: {
  bookings: Booking[];
  userId: string;
  offset: number;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const { user } = useAuth();
  const query = useBookings(initial, userId, offset);
  if (user?.id !== userId) return null;
  const bookings = query.data.items;
  return (
    <>
      <AccountNavigation />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('myBookings')}
        </h1>
        <Button
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          asChild
          variant="link"
        >
          <Link href="/">{t('findTrip')}</Link>
        </Button>
      </div>
      {query.isError && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          role="alert"
        >
          {errorMessage(query.error, locale)}
        </p>
      )}
      {bookings.length === 0 ? (
        <div className="rounded-xl border bg-card px-5 py-10 text-center md:px-6 md:py-14">
          <h2 className="text-xl font-medium md:text-2xl">{t('noBookings')}</h2>
          <p className="mt-2.5 text-sm text-muted-foreground">
            {t('noBookingsText')}
          </p>
          <Button size="lg" asChild>
            <Link href="/">{t('findTrip')}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={'/bookings/' + booking.id}
              className="flex flex-col items-start justify-between gap-2.5 rounded-xl border bg-card p-5 hover:border-sky-300 md:flex-row md:items-center md:gap-5 md:p-6"
            >
              <div>
                <span className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-primary">
                  {t('statuses.' + booking.status)}
                </span>
                <h2 className="mt-3 text-xl font-medium">
                  {displayName(booking.trip.route.originStation.city, locale)} —{' '}
                  {displayName(
                    booking.trip.route.destinationStation.city,
                    locale,
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDate(booking.trip.departureAt, locale)}
                </p>
                <bdi className="mt-2 block text-xs text-muted-foreground wrap-anywhere">
                  {booking.reference}
                </bdi>
              </div>
              <strong className="self-end text-xl whitespace-nowrap md:self-auto md:text-[22px]">
                {formatPrice(booking.totalPiastres, locale)}
              </strong>
            </Link>
          ))}
        </div>
      )}
      <Button
        size="lg"
        variant="outline"
        type="button"
        className="bg-card"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {t('refresh')}
      </Button>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {offset > 0 && (
          <Button size="lg" className="bg-card" asChild variant="outline">
            <Link
              href={'/bookings?offset=' + Math.max(0, offset - 20)}
              prefetch={false}
            >
              {t('previous')}
            </Link>
          </Button>
        )}
        {bookings.length === 20 && (
          <Button size="lg" className="bg-card" asChild variant="outline">
            <Link href={'/bookings?offset=' + (offset + 20)} prefetch={false}>
              {t('next')}
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
