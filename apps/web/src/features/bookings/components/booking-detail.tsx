'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useSession } from '@/providers/session-provider';
import { AuthForm } from '@/features/auth/components/auth-form';
import {
  browserRequest,
  errorMessage,
  BrowserApiError,
} from '@/lib/browser-api';
import {
  displayName,
  formatDate,
  formatPrice,
  formatTime,
} from '@/features/trips/format';
import { Link } from '@/i18n/navigation';
import type { Booking, BookingPayment } from '../types';
export function BookingDetail({ bookingId }: { bookingId: string }) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const { user, status, request } = useSession();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const availability = useQuery({
    queryKey: ['checkout-availability'],
    enabled: status === 'signed-in',
    retry: false,
    staleTime: 5000,
    refetchInterval: 15000,
    queryFn: async () =>
      (
        await browserRequest<{ data: { checkoutEnabled: boolean } }>(
          'payments/availability',
        )
      ).data,
  });
  const query = useQuery({
    queryKey: ['owned-booking', user?.id, bookingId],
    enabled: status === 'signed-in',
    queryFn: async () => {
      const [booking, payment] = await Promise.all([
        request<{ data: Booking }>('bookings/' + bookingId),
        request<{ data: BookingPayment }>('bookings/' + bookingId + '/payment'),
      ]);
      return { booking: booking.data, payment: payment.data };
    },
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.booking.paymentRequired ? 5000 : false,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (status === 'loading')
    return <p className="loading-state">{t('loading')}</p>;
  if (status === 'guest')
    return (
      <div className="panel auth-required">
        <p>{t('signIn')}</p>
        <AuthForm />
      </div>
    );
  if (query.isPending) return <p className="loading-state">{t('loading')}</p>;
  if (query.isError)
    return (
      <div className="notice" role="alert">
        {errorMessage(query.error, locale)}{' '}
        <button
          className="text-button"
          onClick={() => {
            void query.refetch();
            void availability.refetch();
          }}
        >
          {t('refresh')}
        </button>
      </div>
    );
  const { booking, payment } = query.data;
  const seconds = payment.expiresAt
    ? Math.max(
        0,
        Math.floor(
          (Date.parse(payment.expiresAt) -
            Date.parse(payment.serverTime) -
            Math.max(0, now - query.dataUpdatedAt)) /
            1000,
        ),
      )
    : 0;
  const canPay =
    availability.data?.checkoutEnabled === true &&
    booking.paymentRequired &&
    seconds > 0 &&
    ['NOT_STARTED', 'PREPARED', 'AWAITING_PAYMENT'].includes(
      payment.paymentStatus,
    );
  async function pay() {
    if (!canPay || busy) return;
    setBusy(true);
    setError('');
    try {
      if (payment.paymentStatus === 'NOT_STARTED') {
        try {
          await request('bookings/' + bookingId + '/payment-attempt', {
            method: 'POST',
            headers: { 'Idempotency-Key': crypto.randomUUID() },
            body: '{}',
          });
        } catch (cause) {
          if (
            !(cause instanceof BrowserApiError) ||
            cause.code !== 'PAYMENT_ATTEMPT_EXISTS'
          )
            throw cause;
        }
      }
      const result = await request<{ data: BookingPayment }>(
        'bookings/' + bookingId + '/checkout',
        { method: 'POST', body: '{}' },
      );
      const target = result.data.checkoutUrl
        ? new URL(result.data.checkoutUrl)
        : null;
      if (
        !target ||
        target.origin !== 'https://accept.paymob.com' ||
        target.pathname !== '/unifiedcheckout/'
      )
        throw new Error('Checkout not ready');
      window.location.assign(target.href);
    } catch (cause) {
      setError(errorMessage(cause, locale));
      await query.refetch();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="booking-detail-layout">
      <section className="panel booking-detail-main">
        <div className="booking-reference">
          <span>{t('reference')}</span>
          <bdi>{booking.reference}</bdi>
        </div>
        <h1>
          {displayName(booking.trip.route.originStation.city, locale)} —{' '}
          {displayName(booking.trip.route.destinationStation.city, locale)}
        </h1>
        <p className="muted mt-3">
          {formatDate(booking.trip.departureAt, locale)}
        </p>
        <div className="journey-stations">
          <div>
            <strong>{formatTime(booking.trip.departureAt, locale)}</strong>
            <span>{displayName(booking.trip.route.originStation, locale)}</span>
          </div>
          <ArrowRight size={24} className="rtl:rotate-180" />
          <div>
            <strong>{formatTime(booking.trip.arrivalAt, locale)}</strong>
            <span>
              {displayName(booking.trip.route.destinationStation, locale)}
            </span>
          </div>
        </div>
        <h2>{t('passengers')}</h2>
        <div className="passenger-list">
          {booking.passengers?.map((person) => (
            <div key={person.seatId}>
              <span>{person.name}</span>
              <strong>{t('seat', { number: person.seatNumber })}</strong>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm muted">
          {t('contact')} <bdi>{booking.contactPhone}</bdi>
        </p>
        <p className="mt-5 text-sm muted">{t('noCancellation')}</p>
      </section>
      <aside className="panel payment-summary">
        <div
          className={
            'booking-state ' +
            (booking.status === 'CONFIRMED' ? 'confirmed' : '')
          }
        >
          <CheckCircle2 size={21} />
          <strong>{t('statuses.' + booking.status)}</strong>
        </div>
        <div className="summary-total">
          <span>{t('total')}</span>
          <strong>{formatPrice(booking.totalPiastres, locale)}</strong>
        </div>
        {booking.paymentRequired && seconds > 0 && (
          <div className="hold-timer" role="timer">
            <Clock size={20} />
            <span>{t('remaining')}</span>
            <bdi>
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </bdi>
          </div>
        )}
        <p className="muted text-sm leading-7 mb-4">
          {t('paymentState')} {t('paymentStatuses.' + payment.paymentStatus)}
        </p>
        {error && (
          <p className="notice mb-4" role="alert">
            {error}
          </p>
        )}
        {canPay ? (
          <>
            <button
              type="button"
              disabled={busy}
              className="button-primary w-full"
              onClick={pay}
            >
              {busy ? t('working') : t('pay')}
            </button>
            <p className="summary-note">{t('paymentNote')}</p>
          </>
        ) : booking.status === 'EXPIRED' ||
          (booking.paymentRequired && seconds === 0) ? (
          <p className="notice">{t('expired')}</p>
        ) : booking.paymentRequired && !availability.data?.checkoutEnabled ? (
          <p className="notice" role="status">
            {availability.isPending
              ? t('checkingAvailability')
              : t('checkoutUnavailable')}
          </p>
        ) : null}
        <button
          className="text-button w-full mt-4"
          type="button"
          onClick={() => {
            void query.refetch();
            void availability.refetch();
          }}
          disabled={query.isFetching}
        >
          {t('refresh')}
        </button>
        <Link href="/bookings" className="text-button w-full mt-3">
          {t('myBookings')}
        </Link>
      </aside>
    </div>
  );
}
