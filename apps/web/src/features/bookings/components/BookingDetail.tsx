'use client';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
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
    <div className="grid gap-[18px] md:grid-cols-[minmax(0,1fr)_310px] md:gap-6 min-[1001px]:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border bg-card min-w-0 p-6 md:p-[30px]">
        <div className="mb-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>{t('reference')}</span>
          <bdi className="font-semibold tracking-wide text-foreground wrap-anywhere">
            {booking.reference}
          </bdi>
        </div>
        <h1 className="text-2xl font-semibold md:text-[27px]">
          {displayName(booking.trip.route.originStation.city, locale)} —{' '}
          {displayName(booking.trip.route.destinationStation.city, locale)}
        </h1>
        <p className="text-muted-foreground mt-3">
          {formatDate(booking.trip.departureAt, locale)}
        </p>
        <div className="mt-7 flex items-center justify-between gap-3 border-y py-6 md:gap-5">
          <div className="grid min-w-0 gap-1.5">
            <strong className="text-xl font-semibold md:text-[22px]">
              {formatTime(booking.trip.departureAt, locale)}
            </strong>
            <span className="text-xs text-muted-foreground">
              {displayName(booking.trip.route.originStation, locale)}
            </span>
          </div>
          <ArrowRight
            size={24}
            className="shrink-0 text-slate-400 rtl:rotate-180"
          />
          <div className="grid min-w-0 gap-1.5">
            <strong className="text-xl font-semibold md:text-[22px]">
              {formatTime(booking.trip.arrivalAt, locale)}
            </strong>
            <span className="text-xs text-muted-foreground">
              {displayName(booking.trip.route.destinationStation, locale)}
            </span>
          </div>
        </div>
        <h2 className="mt-7 text-lg font-semibold">{t('passengers')}</h2>
        <div className="mt-4 grid gap-2">
          {booking.passengers?.map((person) => (
            <div
              className="flex justify-between gap-3 border-b py-2.5 text-sm"
              key={person.seatId}
            >
              <span>{person.name}</span>
              <strong className="font-medium">
                {t('seat', { number: person.seatNumber })}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">
          {t('contact')} <bdi>{booking.contactPhone}</bdi>
        </p>
        <p className="mt-5 text-sm text-muted-foreground">
          {t('noCancellation')}
        </p>
      </section>
      <aside className="rounded-2xl border bg-card h-fit min-w-0 p-6">
        <div
          className={cn(
            'flex items-center gap-2.5 text-sm',
            outcome === 'paid' ? 'text-emerald-700' : 'text-amber-800',
          )}
        >
          {outcome === 'paid' ? (
            <CheckCircle2 size={21} />
          ) : (
            <Clock size={21} />
          )}
          <strong>{t('statuses.' + payment.bookingStatus)}</strong>
        </div>
        <div className="mt-3 flex items-center justify-between gap-5 border-t py-[18px] text-sm">
          <span>{t('total')}</span>
          <strong className="text-[22px] font-semibold whitespace-nowrap">
            {formatPrice(booking.totalPiastres, locale)}
          </strong>
        </div>
        {!afterCheckout && booking.paymentRequired && seconds > 0 && (
          <div
            className="mb-4 flex items-center gap-2.5 rounded-lg bg-accent p-3 text-xs text-primary"
            role="timer"
          >
            <Clock size={20} />
            <span>{t('remaining')}</span>
            <bdi className="ms-auto text-[21px] font-semibold">
              {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </bdi>
          </div>
        )}
        <p className="text-muted-foreground text-sm leading-7 mb-4">
          {t('paymentState')} {t('paymentStatuses.' + payment.paymentStatus)}
        </p>
        <PaymentStatus payment={payment} />
        {error && (
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950 mb-4"
            role="alert"
          >
            {error}
          </p>
        )}
        {canPay ? (
          <>
            <Button
              size="lg"
              type="button"
              disabled={busy}
              className="w-full"
              onClick={pay}
            >
              {busy ? t('working') : t('pay')}
            </Button>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              {t('paymentNote')}
            </p>
          </>
        ) : outcome === 'waiting' &&
          booking.paymentRequired &&
          seconds === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950">
            {t('expired')}
          </p>
        ) : outcome === 'waiting' &&
          booking.paymentRequired &&
          !checkoutEnabled ? (
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
            role="status"
          >
            {t('checkoutUnavailable')}
          </p>
        ) : null}
        <Button
          variant="link"
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal w-full mt-4"
          type="button"
          onClick={() => {
            void query.refetch();
          }}
          disabled={query.isFetching}
        >
          {t('refresh')}
        </Button>
        <Button
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal w-full mt-3"
          asChild
          variant="link"
        >
          <Link href="/bookings">{t('myBookings')}</Link>
        </Button>
      </aside>
    </div>
  );
}
