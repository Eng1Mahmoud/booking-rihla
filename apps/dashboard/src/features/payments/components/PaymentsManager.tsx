'use client';
import { useTranslations } from 'next-intl';
import { CreditCard } from 'lucide-react';
import { DataTable } from '@/shared/components/tables/DataTable';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { usePayments } from '../hooks/usePayments';
import { usePaymentColumns } from '../hooks/usePaymentColumns';
import { PaymentDetails } from './PaymentDetails';
import { PaymentFilters } from './PaymentFilters';

export function PaymentsManager({ bookingId = '' }: { bookingId?: string }) {
  const page = usePayments(bookingId);
  const t = useTranslations('Payments');
  const columns = usePaymentColumns({ onDetails: page.open });
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
