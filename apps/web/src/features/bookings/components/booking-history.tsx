'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/providers/session-provider';
import { AuthForm } from '@/features/auth/components/auth-form';
import { Link } from '@/i18n/navigation';
import { errorMessage } from '@/lib/browser-api';
import { displayName, formatDate, formatPrice } from '@/features/trips/format';
import type { Booking } from '../types';
import { AccountNavigation } from '@/features/account/components/account-navigation';
export function BookingHistory() {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const { user, status, request } = useSession();
  const [offset, setOffset] = useState(0);
  const query = useQuery({
    queryKey: ['owned-bookings', user?.id, offset],
    enabled: status === 'signed-in',
    retry: false,
    queryFn: () =>
      request<{ data: Booking[] }>('bookings?limit=20&offset=' + offset),
  });
  if (status === 'loading')
    return <p className="loading-state">{t('loading')}</p>;
  if (status === 'guest')
    return (
      <div className="panel auth-required">
        <p>{t('signIn')}</p>
        <AuthForm returnTo="/bookings" />
      </div>
    );
  if (query.isPending) return <p className="loading-state">{t('loading')}</p>;
  if (query.isError)
    return (
      <div role="alert" className="notice">
        {errorMessage(query.error, locale)}{' '}
        <button onClick={() => query.refetch()} className="text-button">
          {t('refresh')}
        </button>
      </div>
    );
  return (
    <>
      <AccountNavigation />
      <div className="section-heading">
        <h1>{t('myBookings')}</h1>
        <Link href="/" className="text-button">
          {t('findTrip')}
        </Link>
      </div>
      {query.data.data.length === 0 ? (
        <div className="empty-state">
          <h2>{t('noBookings')}</h2>
          <p>{t('noBookingsText')}</p>
          <Link href="/" className="button-primary">
            {t('findTrip')}
          </Link>
        </div>
      ) : (
        <div className="booking-history">
          {query.data.data.map((booking) => (
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
      <div className="pagination">
        {offset > 0 && (
          <button
            className="button-secondary"
            onClick={() => setOffset(Math.max(0, offset - 20))}
          >
            {t('previous')}
          </button>
        )}
        {query.data.data.length === 20 && (
          <button
            className="button-secondary"
            onClick={() => setOffset(offset + 20)}
          >
            {t('next')}
          </button>
        )}
      </div>
    </>
  );
}
