'use client';
import { useMemo, useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Ticket, Eye } from 'lucide-react';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { DatePickr } from '@/shared/components/ui/date-pickr';
import { Input } from '@/shared/components/ui/input';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';
import { useBookings } from '../hooks/useBookings';
import { BookingDetails } from './BookingDetails';
import type { Booking } from '../schemas/bookingSchema';
const filterFields = ['reference', 'email', 'travelDate'] as const;
export function BookingsManager({
  tripId = '',
  bookingId = '',
}: {
  tripId?: string;
  bookingId?: string;
}) {
  const page = useBookings(tripId, bookingId),
    locale = useLocale(),
    t = useTranslations('Bookings'),
    states = useTranslations('States');
  const filterId = useId();
  const name = locale === 'ar' ? 'nameAr' : 'nameEn';
  const columns = useMemo<DataTableColumn<Booking>[]>(
    () => [
      {
        id: 'reference',
        header: t('reference'),
        cell: ({ row }) => (
          <bdi className="font-semibold">{row.original.reference}</bdi>
        ),
      },
      {
        id: 'customer',
        header: t('customer'),
        cell: ({ row }) => (
          <div>
            <p>{row.original.customer.name}</p>
            <bdi className="text-sm text-muted-foreground">
              {row.original.customer.email}
            </bdi>
          </div>
        ),
      },
      {
        id: 'route',
        header: t('route'),
        cell: ({ row }) =>
          row.original.trip.route.originStation[name] +
          (locale === 'ar' ? ' ← ' : ' → ') +
          row.original.trip.route.destinationStation[name],
      },
      {
        id: 'departure',
        header: t('departure'),
        cell: ({ row }) =>
          formatReportTime(row.original.trip.departureAt, locale),
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => states(row.original.status),
      },
      {
        id: 'amount',
        header: t('total'),
        cell: ({ row }) =>
          formatGrossPaid(String(row.original.totalPiastres), locale),
      },
      {
        id: 'details',
        header: t('details'),
        meta: { headerClassName: 'w-24 text-center' },
        cell: ({ row }) => (
          <RowActionMenu
            name={row.original.reference}
            actions={[
              {
                label: t('details'),
                icon: Eye,
                onSelect: () => page.open(row.original.id),
              },
            ]}
          />
        ),
      },
    ],
    [t, states, locale, name, page.open],
  );
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
      <form
        key={JSON.stringify(page.list.filters)}
        className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const filters = Object.fromEntries(
            filterFields.map((key) => [
              key,
              String(data.get(key) ?? '').trim(),
            ]),
          );
          page.list.resetFilters({ ...page.list.filters, ...filters });
        }}
      >
        {filterFields.map((field) => (
          <label
            key={field}
            htmlFor={filterId + field}
            className="grid min-w-0 flex-1 basis-44 gap-2 text-sm"
          >
            <span>{t(field)}</span>
            {field === 'travelDate' ? (
              <DatePickr
                id={filterId + field}
                name="travelDate"
                defaultValue={page.list.filters[field]}
                className="min-h-11 bg-card"
              />
            ) : (
              <Input
                id={filterId + field}
                name={field}
                type={field === 'email' ? 'email' : 'text'}
                defaultValue={page.list.filters[field]}
                dir="ltr"
                className="min-h-11 bg-card"
              />
            )}
          </label>
        ))}
        <Button type="submit" className="min-h-11">
          {t('apply')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={(event) => {
            event.currentTarget.form?.reset();
            page.list.resetFilters({
              reference: '',
              email: '',
              travelDate: '',
              tripId: '',
              userId: '',
            });
          }}
        >
          {t('clear')}
        </Button>
      </form>
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
