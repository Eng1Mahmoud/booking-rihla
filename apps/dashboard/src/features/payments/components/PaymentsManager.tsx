'use client';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CreditCard, Eye } from 'lucide-react';
import { RowActionMenu, DataTable } from '@/shared/components/tables';
import { EmptyState, ListError } from '@/shared/components/feedback';
import type { DataTableColumn } from '@/shared/lib';
import { formatReportTime, formatGrossPaid } from '@/features/dashboard';
import { usePayments } from '../hooks/usePayments';
import { PaymentDetails } from './PaymentDetails';
import type { Payment } from '../schemas/paymentSchema';
import { PaymentFilters } from './PaymentFilters';
export function PaymentsManager({ bookingId = '' }: { bookingId?: string }) {
  const page = usePayments(bookingId),
    locale = useLocale(),
    t = useTranslations('Payments'),
    states = useTranslations('States');
  const columns = useMemo<DataTableColumn<Payment>[]>(
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
        id: 'created',
        header: t('createdDate'),
        cell: ({ row }) => formatReportTime(row.original.createdAt, locale),
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => states(row.original.paymentStatus),
      },
      {
        id: 'refund',
        header: t('refund'),
        cell: ({ row }) =>
          row.original.refundStatus ? states(row.original.refundStatus) : '—',
      },
      {
        id: 'amount',
        header: t('amount'),
        cell: ({ row }) =>
          formatGrossPaid(String(row.original.amountPiastres), locale),
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
    [t, states, locale, page.open],
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
      <PaymentFilters state={page.list} />
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
              icon={CreditCard}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.selected && (
        <PaymentDetails
          id={page.selected}
          onClose={page.close}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
    </section>
  );
}
