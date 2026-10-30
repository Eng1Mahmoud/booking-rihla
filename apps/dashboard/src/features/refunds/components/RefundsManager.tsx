'use client';
import { formatGrossPaid } from '@/features/dashboard/lib/format';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { errorMessage } from '@/shared/lib/apiResult';
import { Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRefundColumns } from '../hooks/useRefundColumns';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getRefundsAction } from '../actions/refund.actions';
export function RefundsManager() {
  const { query } = useTableQuery({
    action: getRefundsAction,
    queryKey: 'refunds',
  });

  const locale = useLocale();

  const { columns, ...page } = useRefundColumns();
  async function refresh() {
    if (page.pending) return;
    const result = await query.refetch();
    // An uncertain refund can be retried only after fresh server data is available.
    if (result.isSuccess) page.clearBlocked();
  }

  const t = useTranslations('Refunds');

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
      <p role="status" className="mb-4 text-primary">
        {page.notice}
      </p>
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(query.error, locale)}
          pending={query.isFetching}
          onRetry={refresh}
        />
      )}
      {(query.isPending || query.data) && (
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-240 [&_td]:wrap-anywhere"
          isLoading={query.isPending}
          isFetching={query.isFetching}
          onRefresh={refresh}
          emptyState={
            <EmptyState
              icon={Undo2}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.target && (
        <ConfirmDialog
          open
          variant={
            page.target.operation === 'issue' ? 'destructive' : 'default'
          }
          title={t(page.target.operation)}
          description={t(
            page.target.operation === 'issue' ? 'issueHint' : 'reconcileHint',
            {
              amount: formatGrossPaid(
                page.target.refund.amountPiastres,
                locale,
              ),
            },
          )}
          confirmLabel={t(
            page.target.operation === 'issue'
              ? 'confirmIssue'
              : 'confirmReconcile',
          )}
          pending={page.confirmation.pending}
          confirmDisabled={page.blocked.includes(page.target.refund.id)}
          error={page.confirmation.error}
          onConfirm={page.confirmation.confirm}
          onCancel={page.close}
          onCloseAutoFocus={page.focus.restore}
        >
          {page.blocked.includes(page.target.refund.id) && (
            <p className="mt-4 text-sm text-destructive">{t('refreshFirst')}</p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
