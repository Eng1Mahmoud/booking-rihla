'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { BookingDetails } from '../types/booking';
import { ApiError } from '@/shared/lib/apiResult';
import { useCheckout } from '../hooks/useBookings';
import { useBookingPayment } from '../hooks/useBookingPayment';
import { paymentOutcome } from '../lib/paymentState';
import { remainingHoldSeconds } from '../lib/holdTimer';
import { PaymentChecking } from './PaymentChecking';
import { PaymentSidebar } from './PaymentSidebar';
import { ErrorNotice } from '@/shared/components/feedback/ErrorNotice';

export function BookingPayment({
  initial,
  afterCheckout = false,
  children,
}: {
  initial: BookingDetails;
  afterCheckout?: boolean;
  children: ReactNode;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const bookingId = initial.booking.id;
  const [now, setNow] = useState(initial.readAt);
  const [payError, setPayError] = useState<unknown>(null);
  const expiredRefresh = useRef(false);
  const query = useBookingPayment(initial, afterCheckout);
  const checkout = useCheckout();
  const busy = checkout.isPending;

  const booking = initial.booking;
  const payment = query.data?.payment;
  const checkoutEnabled = query.data?.checkoutEnabled ?? false;
  const seconds = payment
    ? remainingHoldSeconds(payment, now, query.dataUpdatedAt)
    : 0;
  const outcome = payment ? paymentOutcome(payment) : 'waiting';

  useEffect(() => {
    if (afterCheckout) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [afterCheckout]);

  useEffect(() => {
    if (afterCheckout || !payment?.expiresAt || seconds > 0) return;
    if (expiredRefresh.current) return;
    if (['paid', 'expired', 'cancelled', 'refunded'].includes(outcome)) return;
    expiredRefresh.current = true;
    void query.refetch();
  }, [afterCheckout, seconds, payment?.expiresAt, outcome, query]);

  if (query.isError || !payment)
    return (
      <ErrorNotice
        error={query.error ?? new ApiError(0, 'NETWORK_ERROR')}
        onRetry={() => {
          void query.refetch();
        }}
        retryLabel={t('refresh')}
      />
    );

  if (afterCheckout && ['waiting', 'processing'].includes(outcome)) {
    return (
      <PaymentChecking
        reference={booking.reference}
        mode={outcome === 'waiting' ? 'waiting' : 'processing'}
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
    setPayError(null);
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
        throw new ApiError(502, 'PAYMENT_UNAVAILABLE');
      window.location.assign(target.href);
    } catch (cause) {
      setPayError(cause);
      await query.refetch();
    }
  }

  return (
    <div className="grid gap-[18px] md:grid-cols-[minmax(0,1fr)_310px] md:gap-6 min-[1001px]:grid-cols-[minmax(0,1fr)_340px]">
      {children}
      <PaymentSidebar
        booking={booking}
        payment={payment}
        outcome={outcome}
        seconds={seconds}
        showTimer={
          !afterCheckout &&
          booking.paymentRequired &&
          seconds > 0 &&
          outcome === 'waiting'
        }
        canPay={canPay}
        busy={busy}
        payError={payError}
        locale={locale}
        holdExpiredMessage={
          outcome === 'waiting' && booking.paymentRequired && seconds === 0
        }
        checkoutUnavailable={
          outcome === 'waiting' &&
          booking.paymentRequired &&
          !checkoutEnabled &&
          seconds > 0
        }
        refreshing={query.isFetching}
        onPay={pay}
        onRefresh={() => {
          void query.refetch();
        }}
      />
    </div>
  );
}
