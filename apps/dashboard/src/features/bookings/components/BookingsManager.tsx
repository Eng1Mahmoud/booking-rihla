'use client';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { errorMessage } from '@/shared/lib/apiResult';
import { Ticket } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useBookingColumns } from '../hooks/useBookingColumns';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getBookingsAction } from '../actions/booking.actions';
import { BookingFilters } from './BookingFilters';
export function BookingsManager() {
  const { query } = useTableQuery({
    action: getBookingsAction,
    queryKey: 'bookings',
  });

  const locale = useLocale();

  const columns = useBookingColumns();
  const t = useTranslations('Bookings');

  return (
    <section className="min-w-0">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mt-2 mb-7 max-w-[65ch] text-muted-foreground">
        {t('intro')}
      </p>
      <BookingFilters />
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
      )}
    </section>
  );
}
