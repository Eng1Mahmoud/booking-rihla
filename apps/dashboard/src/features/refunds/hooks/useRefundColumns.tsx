'use client';
import { unstable_rethrow } from 'next/navigation';
import {
  formatGrossPaid,
  formatReportTime,
} from '@/features/dashboard/lib/format';
import { Link } from '@/i18n/navigation';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { ApiError, invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { executeRefundAction } from '../actions/refund.actions';
import { type Refund } from '../schemas/refundSchema';
export function useRefundColumns() {
  const locale = useLocale();
  const t = useTranslations('Refunds');
  const states = useTranslations('States');
  const client = useQueryClient();
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [target, setTarget] = useState<{
    refund: Refund;
    operation: 'issue' | 'reconcile';
  } | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!target || blocked.includes(target.refund.id)) return;
      const selected = target;
      try {
        await invokeAction(() =>
          executeRefundAction({
            id: selected.refund.id,
            operation: selected.operation,
          }),
        );
        await Promise.all(
          ['refunds', 'payments', 'payment', 'bookings', 'booking'].map((key) =>
            client.invalidateQueries({ queryKey: [key] }),
          ),
        );
        setTarget(null);
        setNotice(t('updated'));
      } catch (error) {
        unstable_rethrow(error);
        if (
          !(error instanceof ApiError) ||
          error.status === 0 ||
          error.status >= 500
        )
          setBlocked((current) => [
            ...new Set([...current, selected.refund.id]),
          ]);
        throw error;
      }
    },
  });
  const confirmation = useConfirmation(async () => {
    await mutation.mutateAsync();
  });
  const open = useCallback(
    (refund: Refund, operation: 'issue' | 'reconcile') => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setTarget({ refund, operation });
    },
    [focus.remember, confirmation.reset],
  );
  const columns: DataTableColumn<Refund>[] = [
    {
      id: 'booking',
      header: t('booking'),
      meta: { headerClassName: 'w-60' },
      cell: ({ row }) => (
        <Link
          href={
            '/dashboard/bookings/' + encodeURIComponent(row.original.bookingId)
          }
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
        const refund = row.original;
        const isBlocked = blocked.includes(refund.id);
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
                        disabled: isBlocked,
                        onSelect: () => open(refund, 'issue'),
                      },
                    ]
                  : []),
                ...(['REQUESTED', 'UNKNOWN', 'REVIEW'].includes(refund.status)
                  ? [
                      {
                        label: t('reconcile'),
                        icon: RefreshCw,
                        disabled: isBlocked,
                        onSelect: () => open(refund, 'reconcile'),
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
            {isBlocked && (
              <span className="text-sm text-destructive">
                {t('refreshFirst')}
              </span>
            )}
          </div>
        );
      },
    },
  ];
  return {
    focus,
    target,
    blocked,
    notice,
    confirmation,
    columns,
    pending: mutation.isPending,
    clearBlocked: () => setBlocked([]),
    open,
    close: () => {
      if (!confirmation.pending) setTarget(null);
    },
  };
}
