'use client';
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
      <div className="section-heading">
        <h1>{t('myBookings')}</h1>
        <Link href="/" className="text-button">
          {t('findTrip')}
        </Link>
      </div>
      {query.isError && (
        <p className="notice" role="alert">
          {errorMessage(query.error, locale)}
        </p>
      )}
      {bookings.length === 0 ? (
        <div className="empty-state">
          <h2>{t('noBookings')}</h2>
          <p>{t('noBookingsText')}</p>
          <Link href="/" className="button-primary">
            {t('findTrip')}
          </Link>
        </div>
      ) : (
        <div className="booking-history">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={'/bookings/' + booking.id}
              className="history-row"
            >
              <div>
                <span className="pill">{t('statuses.' + booking.status)}</span>
                <h2>
                  {displayName(booking.trip.route.originStation.city, locale)} —{' '}
                  {displayName(
                    booking.trip.route.destinationStation.city,
                    locale,
                  )}
                </h2>
                <p>{formatDate(booking.trip.departureAt, locale)}</p>
                <bdi>{booking.reference}</bdi>
              </div>
              <strong>{formatPrice(booking.totalPiastres, locale)}</strong>
            </Link>
          ))}
        </div>
      )}
      <button
        type="button"
        className="button-secondary"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {t('refresh')}
      </button>
      <div className="pagination">
        {offset > 0 && (
          <Link
            className="button-secondary"
            href={'/bookings?offset=' + Math.max(0, offset - 20)}
            prefetch={false}
          >
            {t('previous')}
          </Link>
        )}
        {bookings.length === 20 && (
          <Link
            className="button-secondary"
            href={'/bookings?offset=' + (offset + 20)}
            prefetch={false}
          >
            {t('next')}
          </Link>
        )}
      </div>
    </>
  );
}
