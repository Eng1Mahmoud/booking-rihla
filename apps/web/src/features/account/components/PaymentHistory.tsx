'use client';
import { useLocale, useTranslations } from 'next-intl';
import { CreditCard, RefreshCw, ArrowUpRight, RotateCcw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import { ErrorNotice, EmptyState } from '@/shared/components/feedback';
import { formatDate, formatTime, formatPrice, cn } from '@/shared/lib';
import type { PaymentHistoryPage, PaymentHistoryItem } from '../types/payment';
import { usePaymentHistory } from '../hooks/usePaymentHistory';

function paymentTone(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-800';
  if (['FAILED', 'EXPIRED'].includes(status))
    return 'bg-muted text-muted-foreground';
  if (status === 'REFUNDED') return 'bg-secondary text-primary';
  return 'bg-amber-50 text-amber-900';
}

export function PaymentHistory({
  initial,
  userId,
  readAt,
}: {
  initial: PaymentHistoryPage;
  userId: string;
  readAt: number;
}) {
  const t = useTranslations('PaymentHistory');
  const query = usePaymentHistory(initial, userId, readAt);
  if (query.user?.id !== userId) return null;
  const { items, pagination } = query.data;
  return (
    <>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">{t('title')}</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('intro')}
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11 bg-card"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            size={16}
            aria-hidden="true"
            className={cn(query.isFetching && 'motion-safe:animate-spin')}
          />
          {t('refresh')}
        </Button>
      </div>
      {query.isError && (
        <div className="mb-5">
          <ErrorNotice
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </div>
      )}
      <p className="mb-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <CreditCard size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {t('attemptNote')}
      </p>
      {items.length ? (
        <div className="overflow-hidden rounded-2xl border bg-card">
          <div
            className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-5 border-b bg-secondary/30 px-6 py-4 text-xs font-medium text-muted-foreground xl:grid"
            aria-hidden="true"
          >
            <span>{t('bookingAndDate')}</span>
            <span>{t('payment')}</span>
            <span>{t('refund')}</span>
          </div>
          <ul className="divide-y">
            {items.map((item) => (
              <PaymentHistoryRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ) : (
        <EmptyState
          title={t(pagination.offset ? 'endTitle' : 'emptyTitle')}
          description={t(pagination.offset ? 'endNote' : 'emptyNote')}
        >
          <Button asChild>
            <Link href={pagination.offset ? '/account/payments' : '/'}>
              {t(pagination.offset ? 'firstPage' : 'findTrip')}
            </Link>
          </Button>
        </EmptyState>
      )}
      {(pagination.offset > 0 || pagination.hasMore) && (
        <nav
          aria-label={t('pagination')}
          className="mt-7 flex flex-wrap items-center justify-between gap-3"
        >
          {pagination.offset > 0 ? (
            <Button asChild variant="outline" className="min-h-11 bg-card">
              <Link
                prefetch={false}
                href={
                  '/account/payments?offset=' +
                  Math.max(0, pagination.offset - pagination.limit)
                }
              >
                {t('previous')}
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {pagination.hasMore &&
            pagination.offset + pagination.limit <= 100000 && (
              <Button asChild variant="outline" className="min-h-11 bg-card">
                <Link
                  prefetch={false}
                  href={
                    '/account/payments?offset=' +
                    (pagination.offset + pagination.limit)
                  }
                >
                  {t('next')}
                </Link>
              </Button>
            )}
        </nav>
      )}
      <p className="mt-6 text-xs text-muted-foreground">{t('timeZone')}</p>
    </>
  );
}

function PaymentHistoryRow({ item }: { item: PaymentHistoryItem }) {
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
