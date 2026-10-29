'use client';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getPaymentsAction } from '../actions/payment.actions';
import { usePaymentColumns } from '../hooks/usePaymentColumns';
import {
  emptyPaymentFilters,
  type PaymentFilterValues,
} from '../schemas/paymentSchema';
import { PaymentDetails } from './PaymentDetails';
import { PaymentFilters } from './PaymentFilters';
export function PaymentsManager({ bookingId = '' }: { bookingId?: string }) {
  const locale = useLocale();

  const list = useDataTableState<PaymentFilterValues>({
    initialFilters: { ...emptyPaymentFilters, bookingId },
  });
  const query = useQuery({
    queryKey: ['payments', locale, list.params],
    queryFn: () =>
      invokeAction(() =>
        getPaymentsAction({
          limit: list.params.limit,
          offset: list.params.offset,
          ...list.filters,
        }),
      ),
  });
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
      <PaymentFilters state={list} />
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
