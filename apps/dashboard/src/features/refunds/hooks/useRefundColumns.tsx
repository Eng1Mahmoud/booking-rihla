'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { Undo2, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';
import type { Refund } from '../schemas/refundSchema';

export function useRefundColumns({
  blockedIds,
  onAction,
}: {
  blockedIds: string[];
  onAction: (refund: Refund, operation: 'issue' | 'reconcile') => void;
}): DataTableColumn<Refund>[] {
  const locale = useLocale();
  const t = useTranslations('Refunds');
  const states = useTranslations('States');
  return [
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
        const refund = row.original;
        const blocked = blockedIds.includes(refund.id);
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
                        onSelect: () => onAction(refund, 'issue'),
                      },
                    ]
                  : []),
                ...(['REQUESTED', 'UNKNOWN', 'REVIEW'].includes(refund.status)
                  ? [
                      {
                        label: t('reconcile'),
                        icon: RefreshCw,
                        disabled: blocked,
                        onSelect: () => onAction(refund, 'reconcile'),
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
  ];
}
