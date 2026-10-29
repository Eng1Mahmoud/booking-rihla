'use client';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { formatDate, formatTime, formatPrice } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { PaymentHistoryItem } from '../types/payment';

function paymentTone(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-800';
  if (['FAILED', 'EXPIRED'].includes(status))
    return 'bg-muted text-muted-foreground';
  if (status === 'REFUNDED') return 'bg-secondary text-primary';
  return 'bg-amber-50 text-amber-900';
}

export function PaymentHistoryRow({ item }: { item: PaymentHistoryItem }) {
  const t = useTranslations('PaymentHistory');
  const payment = useTranslations('Booking.paymentStatuses');
  const refunds = useTranslations('PaymentResult.refundStatuses');
  const locale = useLocale() as 'ar' | 'en';
  return (
    <li className="grid min-w-0 gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <Link
          href={'/bookings/' + item.bookingId}
          className="inline-flex min-h-11 max-w-full items-center gap-2 font-semibold text-primary hover:underline"
        >
          <bdi className="break-all">{item.reference}</bdi>
          <ArrowUpRight
            size={17}
            aria-hidden="true"
            className="shrink-0 rtl:-scale-x-100"
          />
          <span className="sr-only">{t('viewBooking')}</span>
        </Link>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          <span className="sr-only">{t('attemptDate')}: </span>
          <time dateTime={item.createdAt}>
            {formatDate(item.createdAt, locale)}
            <span className="mx-1">—</span>
            <bdi>{formatTime(item.createdAt, locale)}</bdi>
          </time>
        </p>
        {item.bookingStatus === 'CANCELLED' && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('cancelledByCompany')}
          </p>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground xl:sr-only">
          {t('payment')}
        </p>
        <p className="mb-2 text-lg font-semibold">
          <bdi>{formatPrice(item.amountPiastres, locale)}</bdi>
        </p>
        <span
          className={cn(
            'inline-block rounded-md px-2.5 py-1 text-xs font-medium',
            paymentTone(item.paymentStatus),
          )}
        >
          {payment.has(item.paymentStatus)
            ? payment(item.paymentStatus)
            : payment('REVIEW')}
        </span>
      </div>
      <div className="min-w-0 border-t pt-4 xl:border-0 xl:pt-0">
        <p className="mb-2 text-xs text-muted-foreground xl:sr-only">
          {t('refund')}
        </p>
        {item.refund ? (
          <>
            <p className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <RotateCcw
                size={15}
                aria-hidden="true"
                className="text-primary"
              />
              <bdi>{formatPrice(item.refund.amountPiastres, locale)}</bdi>
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {refunds.has(item.refund.status)
                ? refunds(item.refund.status)
                : refunds('REVIEW')}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t('refundUpdated')}{' '}
              <time dateTime={item.refund.updatedAt}>
                {formatDate(item.refund.updatedAt, locale)} —{' '}
                <bdi>{formatTime(item.refund.updatedAt, locale)}</bdi>
              </time>
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('noRefund')}</p>
        )}
      </div>
    </li>
  );
}
