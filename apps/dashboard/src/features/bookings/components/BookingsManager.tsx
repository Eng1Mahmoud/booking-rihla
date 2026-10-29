'use client';
import { useTranslations } from 'next-intl';
import { Ticket } from 'lucide-react';
import { DataTable } from '@/shared/components/tables/DataTable';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { useBookings } from '../hooks/useBookings';
import { useBookingColumns } from '../hooks/useBookingColumns';
import { BookingFilters } from './BookingFilters';
import { BookingDetails } from './BookingDetails';

export function BookingsManager({
  tripId = '',
  bookingId = '',
}: {
  tripId?: string;
  bookingId?: string;
}) {
  const page = useBookings(tripId, bookingId);
  const t = useTranslations('Bookings');

  const columns = useBookingColumns({ onDetails: page.open });
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
      <BookingFilters state={page.list} />
      {page.query.isError && (
        <ListError
          title={t('readFailed')}
          description={t('readFailedHint')}
          pending={page.query.isFetching}
          onRetry={() => {
            void page.query.refetch();
          }}
        />
      )}
      {(page.query.isPending || page.query.data) && (
        <DataTable
          state={page.list}
          columns={columns}
          data={page.query.data?.items ?? []}
          rowCount={page.query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-300 [&_td]:wrap-anywhere"
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          onRefresh={() => {
            void page.query.refetch();
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
