import { getLocale, getTranslations } from 'next-intl/server';
import { RefreshPage } from '@/shared/components/RefreshPage';
import type { Booking } from '../types/booking';
import { Link } from '@/i18n/navigation';
import { displayName, formatDate, formatPrice } from '@/shared/lib/format';
import { AccountNavigation } from '@/features/account/components/AccountNavigation';
export async function BookingHistory({
  bookings,
  offset,
}: {
  bookings: Booking[];
  offset: number;
}) {
  const locale = (await getLocale()) as 'ar' | 'en';
  const t = await getTranslations('Booking');
  return (
    <>
      <AccountNavigation />
      <div className="section-heading">
        <h1>{t('myBookings')}</h1>
        <Link href="/" className="text-button">
          {t('findTrip')}
        </Link>
      </div>
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
      <RefreshPage label={t('refresh')} />
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
