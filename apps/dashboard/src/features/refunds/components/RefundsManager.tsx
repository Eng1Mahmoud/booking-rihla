'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Undo2 } from 'lucide-react';
import { DataTable } from '@/shared/components/tables/DataTable';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { ListError } from '@/shared/components/feedback/ListError';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { formatGrossPaid } from '@/features/dashboard/lib/format';
import { useRefunds } from '../hooks/useRefunds';
import { useRefundColumns } from '../hooks/useRefundColumns';

export function RefundsManager() {
  const page = useRefunds();
  const locale = useLocale();
  const t = useTranslations('Refunds');
  const columns = useRefundColumns({
    blockedIds: page.blocked,
    onAction: page.open,
  });
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
      {page.query.isError && (
        <ListError
          title={t('readFailed')}
          description={t('readFailedHint')}
          pending={page.query.isFetching}
          onRetry={page.refresh}
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
          tableClassName="min-w-240 [&_td]:wrap-anywhere"
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          onRefresh={page.refresh}
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
