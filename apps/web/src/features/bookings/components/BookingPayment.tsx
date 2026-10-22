'use client';
import { Button } from '@/shared/components/ui/button';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { BookingDetails } from '../types/booking';
import { errorMessage } from '@/shared/lib/apiResult';
import { useCheckout } from '../hooks/useBookings';
import { useBookingPayment } from '../hooks/useBookingPayment';
import { paymentOutcome } from '@/features/bookings/lib/paymentState';
import { remainingHoldSeconds } from '@/features/bookings/lib/holdTimer';
import { PaymentChecking } from '@/features/bookings/components/PaymentChecking';
import { PaymentSidebar } from '@/features/bookings/components/PaymentSidebar';

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
  const [error, setError] = useState('');
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
      <div
        className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
        role="alert"
      >
        {errorMessage(query.error, locale)}{' '}
        <Button
          variant="link"
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          onClick={() => {
            void query.refetch();
          }}
        >
          {t('refresh')}
        </Button>
      </div>
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
        error={error}
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
