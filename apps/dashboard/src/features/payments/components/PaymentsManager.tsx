'use client';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { errorMessage } from '@/shared/lib/apiResult';
import { CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePaymentColumns } from '../hooks/usePaymentColumns';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getPaymentsAction } from '../actions/payment.actions';
import { PaymentDetails } from './PaymentDetails';
import { PaymentFilters } from './PaymentFilters';
export function PaymentsManager() {
  const { query } = useTableQuery({
    action: getPaymentsAction,
    queryKey: 'payments',
  });

  const locale = useLocale();

  const { columns, ...page } = usePaymentColumns();
  const t = useTranslations('Payments');

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
      <PaymentFilters />
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
