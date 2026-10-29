'use client';
import { Button } from '@/shared/components/ui';
import { cn, formatPrice } from '@/shared/lib';
import { useTranslations } from 'next-intl';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Booking, BookingPaymentData } from '../types/booking';
import { PaymentStatus } from './PaymentStatus';
import { ErrorNotice } from '@/shared/components/feedback';

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

export function PaymentSidebar({
  booking,
  payment,
  outcome,
  seconds,
  showTimer,
  canPay,
  busy,
  payError,
  locale,
  checkoutUnavailable,
  holdExpiredMessage,
  refreshing,
  onPay,
  onRefresh,
}: {
  booking: Booking;
  payment: BookingPaymentData;
  outcome: string;
  seconds: number;
  showTimer: boolean;
  canPay: boolean;
  busy: boolean;
  payError: unknown;
  locale: 'ar' | 'en';
  checkoutUnavailable: boolean;
  holdExpiredMessage: boolean;
  refreshing: boolean;
  onPay: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations('Booking');
  return (
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
      {showTimer && (
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
      {payError != null && (
        <ErrorNotice
          error={payError}
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
        />
      )}
      {canPay ? (
        <>
          <Button
            size="lg"
            type="button"
            disabled={busy}
            className="w-full"
            onClick={onPay}
          >
            {busy ? t('working') : t('pay')}
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
            {t('paymentNote')}
          </p>
        </>
      ) : holdExpiredMessage ? (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          role="status"
        >
          {t('expired')}
        </p>
      ) : checkoutUnavailable ? (
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
        onClick={onRefresh}
        disabled={refreshing}
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
  );
}
