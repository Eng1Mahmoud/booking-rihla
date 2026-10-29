'use client';
import { Button } from '@/shared/components/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useBookings } from '../hooks/useBookings';
import { ErrorNotice, EmptyState } from '@/shared/components/feedback';
import {
  bookingFilterSchema,
  type BookingFilter,
} from '../schemas/bookingSchema';
import type { BookingListPage } from '../types/booking';
import { Link } from '@/i18n/navigation';
import { displayName, formatDate, formatPrice } from '@/shared/lib';
function historyHref(filter: BookingFilter, offset = 0) {
  return (
    '/bookings?' +
    new URLSearchParams({
      filter,
      ...(offset ? { offset: String(offset) } : {}),
    })
  );
}

export function BookingHistory({
  initial,
  userId,
  readAt,
}: {
  initial: BookingListPage;
  userId: string;
  readAt: number;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Booking');
  const query = useBookings(initial, userId, readAt);
  if (query.user?.id !== userId) return null;
  const bookings = query.data.items;
  const { offset, limit, filter, hasMore } = query.data.pagination;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
        <h1 className="text-[26px] font-semibold md:text-[29px]">
          {t('myBookings')}
        </h1>
        <Button
          className="h-auto min-h-11 px-0 py-2 text-primary underline underline-offset-4 whitespace-normal"
          asChild
          variant="link"
        >
          <Link href="/">{t('findTrip')}</Link>
        </Button>
      </div>
      <nav
        aria-label={t('historyFilterLabel')}
        className="mb-4 flex flex-wrap gap-1 rounded-xl border bg-card p-1.5"
      >
        {bookingFilterSchema.options.map((value) => (
          <Button
            key={value}
            asChild
            variant="ghost"
            className="min-h-11 h-auto px-3 text-sm"
          >
            <Link
              href={historyHref(value)}
              prefetch={false}
              aria-current={value === filter ? 'page' : undefined}
              className="aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
            >
              {t('historyFilters.' + value)}
            </Link>
          </Button>
        ))}
      </nav>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('historyNotes.' + filter)}
      </p>
      {query.isError && (
        <div className="mb-5">
          <ErrorNotice
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </div>
      )}
      {bookings.length === 0 ? (
        <EmptyState
          title={t(
            offset
              ? 'historyEnd'
              : filter === 'all'
                ? 'noBookings'
                : 'historyEmpty',
          )}
          description={t(
            offset
              ? 'historyEndNote'
              : filter === 'all'
                ? 'noBookingsText'
                : 'historyEmptyNote',
          )}
        >
          <Button asChild variant="outline">
            <Link href={offset ? historyHref(filter) : historyHref('all')}>
              {t(offset ? 'historyFirstPage' : 'historyFilters.all')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/">{t('findTrip')}</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-3.5">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={'/bookings/' + booking.id}
              className="flex flex-col items-start justify-between gap-2.5 rounded-xl border bg-card p-5 hover:border-sky-300 md:flex-row md:items-center md:gap-5 md:p-6"
            >
              <div>
                <span className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-primary">
                  {t('statuses.' + booking.status)}
                </span>
                <h2 className="mt-3 text-xl font-medium">
                  {displayName(booking.trip.route.originStation.city, locale)} —{' '}
                  {displayName(
                    booking.trip.route.destinationStation.city,
                    locale,
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDate(booking.trip.departureAt, locale)}
                </p>
                <bdi className="mt-2 block text-xs text-muted-foreground wrap-anywhere">
                  {booking.reference}
                </bdi>
              </div>
              <strong className="self-end text-xl whitespace-nowrap md:self-auto md:text-[22px]">
                {formatPrice(booking.totalPiastres, locale)}
              </strong>
            </Link>
          ))}
        </div>
      )}
      <Button
        size="lg"
        variant="outline"
        type="button"
        className="bg-card"
        disabled={query.isFetching}
        onClick={() => void query.refetch()}
      >
        {t('refresh')}
      </Button>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {offset > 0 && (
          <Button size="lg" className="bg-card" asChild variant="outline">
            <Link
              href={historyHref(filter, Math.max(0, offset - limit))}
              prefetch={false}
            >
              {t('previous')}
            </Link>
          </Button>
        )}
        {hasMore && offset + limit <= 100000 && (
          <Button size="lg" className="bg-card" asChild variant="outline">
            <Link href={historyHref(filter, offset + limit)} prefetch={false}>
              {t('next')}
            </Link>
          </Button>
        )}
      </div>
    </>
  );
}
