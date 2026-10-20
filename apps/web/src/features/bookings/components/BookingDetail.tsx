'use client';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import type { BookingDetails } from '../types/booking';
import { errorMessage } from '@/shared/lib/apiResult';
import { useBookingPayment, useCheckout } from '../hooks/useBookings';
import {
  displayName,
  formatDate,
  formatPrice,
  formatTime,
} from '@/shared/lib/format';
import { Link } from '@/i18n/navigation';
import { paymentOutcome } from '@/features/bookings/lib/paymentState';
import { PaymentStatus } from '@/features/bookings/components/PaymentStatus';
import { PaymentChecking } from '@/features/bookings/components/PaymentChecking';
export function BookingDetail({
  initial,
  afterCheckout = false,
}: {
  initial: BookingDetails;
  afterCheckout?: boolean;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const bookingId = initial.booking.id;
  const [now, setNow] = useState(initial.readAt);
  const [error, setError] = useState('');
  const query = useBookingPayment(initial, afterCheckout);
  const checkout = useCheckout();
  const busy = checkout.isPending;
  useEffect(() => {
    if (afterCheckout) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [afterCheckout]);
  if (query.isError)
    return (
      <div className="notice" role="alert">
        {errorMessage(query.error, locale)}{' '}
        <button
          className="text-button"
          onClick={() => {
            void query.refetch();
          }}
        >
          {t('refresh')}
        </button>
      </div>
    );
  const booking = initial.booking;
  const { payment, checkoutEnabled } = query.data;
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
  const outcome = paymentOutcome(payment);
  // A return from checkout never offers another charge while verification is pending.
  if (afterCheckout && ['waiting', 'processing'].includes(outcome)) {
    return (
      <PaymentChecking
        reference={booking.reference}
        onRefresh={() => void query.refetch()}
        refreshing={query.isFetching}
      />
    );
  }
  const canPay =
    !afterCheckout &&
    checkoutEnabled &&
    booking.paymentRequired &&
    seconds > 0 &&
    ['NOT_STARTED', 'PREPARED', 'AWAITING_PAYMENT'].includes(
      payment.paymentStatus,
    );
  async function pay() {
    if (!canPay || busy) return;
    setError('');
    try {
      const result = await checkout.mutateAsync({
        id: bookingId,
        prepare: payment.paymentStatus === 'NOT_STARTED',
      });
      const target = result.checkoutUrl ? new URL(result.checkoutUrl) : null;
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
          className={'booking-state ' + (outcome === 'paid' ? 'confirmed' : '')}
        >
          {outcome === 'paid' ? (
            <CheckCircle2 size={21} />
          ) : (
            <Clock size={21} />
          )}
          <strong>{t('statuses.' + payment.bookingStatus)}</strong>
        </div>
        <div className="summary-total">
          <span>{t('total')}</span>
          <strong>{formatPrice(booking.totalPiastres, locale)}</strong>
        </div>
        {!afterCheckout && booking.paymentRequired && seconds > 0 && (
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
        <PaymentStatus payment={payment} />
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
        ) : outcome === 'waiting' &&
          booking.paymentRequired &&
          seconds === 0 ? (
          <p className="notice">{t('expired')}</p>
        ) : outcome === 'waiting' &&
          booking.paymentRequired &&
          !checkoutEnabled ? (
          <p className="notice" role="status">
            {t('checkoutUnavailable')}
          </p>
        ) : null}
        <button
          className="text-button w-full mt-4"
          type="button"
          onClick={() => {
            void query.refetch();
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
