'use client';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Undo2, RefreshCw } from 'lucide-react';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { Link } from '@/i18n/navigation';
import { DataTable } from '@/shared/components/tables/DataTable';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { ListError } from '@/shared/components/feedback/ListError';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import {
  formatGrossPaid,
  formatReportTime,
} from '@/features/dashboard/lib/format';
import { useRefunds } from '../hooks/useRefunds';
import type { Refund } from '../schemas/refundSchema';
export function RefundsManager() {
  const page = useRefunds(),
    locale = useLocale(),
    t = useTranslations('Refunds'),
    states = useTranslations('States');
  const columns = useMemo<DataTableColumn<Refund>[]>(
    () => [
      {
        id: 'booking',
        header: t('booking'),
        meta: { headerClassName: 'w-60' },
        cell: ({ row }) => (
          <Link
            href={'/dashboard/bookings?bookingId=' + row.original.bookingId}
            className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4"
          >
            <bdi>{row.original.bookingId}</bdi>
          </Link>
        ),
      },
      {
        id: 'amount',
        header: t('amount'),
        cell: ({ row }) => formatGrossPaid(row.original.amountPiastres, locale),
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => states(row.original.status),
      },
      {
        id: 'updated',
        header: t('lastUpdated'),
        cell: ({ row }) => formatReportTime(row.original.updatedAt, locale),
      },
      {
        id: 'actions',
        header: t('actions'),
        meta: { headerClassName: 'w-24 text-center' },
        cell: ({ row }) => {
          const refund = row.original,
            blocked = page.blocked.includes(refund.id);
          return (
            <div className="grid justify-items-center gap-2">
              <RowActionMenu
                name={refund.bookingId}
                actions={[
                  ...(refund.status === 'PENDING'
                    ? [
                        {
                          label: t('issue'),
                          icon: Undo2,
                          disabled: blocked,
                          onSelect: () => page.open(refund, 'issue'),
                        },
                      ]
                    : []),
                  ...(['REQUESTED', 'UNKNOWN', 'REVIEW'].includes(refund.status)
                    ? [
                        {
                          label: t('reconcile'),
                          icon: RefreshCw,
                          disabled: blocked,
                          onSelect: () => page.open(refund, 'reconcile'),
                        },
                      ]
                    : []),
                ]}
              />
              {refund.status === 'SUCCEEDED' && (
                <span className="text-sm text-muted-foreground">
                  {t('completed')}
                </span>
              )}
              {blocked && (
                <span className="text-sm text-destructive">
                  {t('refreshFirst')}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [t, states, locale, page.blocked, page.open],
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
