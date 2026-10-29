'use client';
import { useTranslations } from 'next-intl';
import { CreditCard, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { ErrorNotice } from '@/shared/components/feedback/ErrorNotice';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { cn } from '@/shared/lib/cn';
import type { PaymentHistoryPage } from '../types/payment';
import { PaymentHistoryRow } from './PaymentHistoryRow';
import { usePaymentHistory } from '../hooks/usePaymentHistory';

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
