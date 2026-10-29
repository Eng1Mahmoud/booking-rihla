'use client';
import type { BookingFilters as BookingFilterValues } from '../schemas/bookingSchema';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { useQuery } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getBookingsAction } from '../actions/booking.actions';
import { useBookingColumns } from '../hooks/useBookingColumns';
import { BookingDetails } from './BookingDetails';
import { BookingFilters } from './BookingFilters';
export function BookingsManager({
  tripId = '',
  bookingId = '',
}: {
  tripId?: string;
  bookingId?: string;
}) {
  const locale = useLocale();

  const list = useDataTableState<BookingFilterValues>({
    initialFilters: {
      reference: '',
      email: '',
      travelDate: '',
      tripId,
      userId: '',
    },
  });
  const query = useQuery({
    queryKey: ['bookings', locale, list.params],
    queryFn: () =>
      invokeAction(() =>
        getBookingsAction({
          limit: list.params.limit,
          offset: list.params.offset,
          ...list.filters,
        }),
      ),
  });
  const { columns, ...page } = useBookingColumns(bookingId);
  const t = useTranslations('Bookings');

  return (
    <section className="min-w-0">
      <h1
        ref={page.focus.fallbackRef}
        tabIndex={-1}
        className="text-3xl font-bold tracking-tight"
      >
        {t('title')}
      </h1>
      <p className="mt-2 mb-7 max-w-[65ch] text-muted-foreground">
        {t('intro')}
      </p>
      <BookingFilters state={list} />
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(query.error, locale)}
          pending={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {(query.isPending || query.data) && (
        <DataTable
          state={list}
          columns={columns}
          data={query.data?.items ?? []}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-300 [&_td]:wrap-anywhere"
          isLoading={query.isPending}
          isFetching={query.isFetching}
          onRefresh={() => {
            void query.refetch();
          }}
          emptyState={
            <EmptyState
              icon={Ticket}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.selected && (
        <BookingDetails
          id={page.selected}
          onClose={page.close}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
    </section>
  );
}
