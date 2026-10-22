'use client';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import type { BookingDetails } from '../types/booking';
import { errorMessage } from '@/shared/lib/apiResult';
import { useCheckout } from '../hooks/useBookings';
import { useBookingPayment } from '../hooks/useBookingPayment';
import { formatPrice } from '@/shared/lib/format';
import { Link } from '@/i18n/navigation';
import { paymentOutcome } from '@/features/bookings/lib/paymentState';
import { PaymentStatus } from '@/features/bookings/components/PaymentStatus';
import { PaymentChecking } from '@/features/bookings/components/PaymentChecking';

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === 'paid') return <CheckCircle2 size={21} />;
  if (outcome === 'processing')
    return (
      <LoaderCircle
        size={21}
        className="animate-spin motion-reduce:animate-none"
      />
    );
  if (['failed', 'expired', 'cancelled'].includes(outcome))
    return <XCircle size={21} />;
  if (['review', 'refundRequired'].includes(outcome))
    return <AlertTriangle size={21} />;
  return <Clock size={21} />;
}

const outcomeTone: Record<string, string> = {
  paid: 'text-emerald-700',
  processing: 'text-sky-700',
  waiting: 'text-amber-800',
  failed: 'text-destructive',
  expired: 'text-destructive',
  cancelled: 'text-destructive',
  review: 'text-amber-800',
  refundRequired: 'text-amber-800',
  refunded: 'text-muted-foreground',
};

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
  const seconds =
    payment?.expiresAt
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
  const outcome = payment ? paymentOutcome(payment) : 'waiting';

  useEffect(() => {
    if (afterCheckout) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [afterCheckout]);

  // When the local hold timer hits zero, refresh once for server expiry state.
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

  // Return from Paymob: keep a focused checking screen while unresolved.
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
      <aside className="h-fit min-w-0 rounded-2xl border bg-card p-6">
        <div
          className={cn(
            'flex items-center gap-2.5 text-sm',
            outcomeTone[outcome] ?? 'text-amber-800',
          )}
        >
          <OutcomeIcon outcome={outcome} />
          <strong>{t('statuses.' + payment.bookingStatus)}</strong>
        </div>
        <div className="mt-3 flex items-center justify-between gap-5 border-t py-[18px] text-sm">
          <span>{t('total')}</span>
          <strong className="text-[22px] font-semibold whitespace-nowrap">
            {formatPrice(booking.totalPiastres, locale)}
          </strong>
        </div>
        {!afterCheckout &&
          booking.paymentRequired &&
          seconds > 0 &&
          outcome === 'waiting' && (
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
        <p className="mb-4 text-sm leading-7 text-muted-foreground">
          {t('paymentState')} {t('paymentStatuses.' + payment.paymentStatus)}
        </p>
        <PaymentStatus payment={payment} />
        {error && (
          <p
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
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
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
            role="status"
          >
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
          className="mt-4 h-auto min-h-11 w-full px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          type="button"
          onClick={() => {
            void query.refetch();
          }}
          disabled={query.isFetching}
        >
          {t('refresh')}
        </Button>
        <Button
          className="mt-3 h-auto min-h-11 w-full px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          asChild
          variant="link"
        >
          <Link href="/bookings">{t('myBookings')}</Link>
        </Button>
      </aside>
    </div>
  );
}
