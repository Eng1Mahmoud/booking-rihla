'use client';
import { useLocale, useTranslations } from 'next-intl';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { Eye } from 'lucide-react';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';
import type { Payment } from '../schemas/paymentSchema';

export function usePaymentColumns({
  onDetails,
}: {
  onDetails: (id: string) => void;
}): DataTableColumn<Payment>[] {
  const locale = useLocale();
  const t = useTranslations('Payments');
  const states = useTranslations('States');
  return [
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
              onSelect: () => onDetails(row.original.id),
            },
          ]}
        />
      ),
    },
  ];
}
