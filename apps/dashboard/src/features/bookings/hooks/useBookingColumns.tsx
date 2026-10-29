'use client';
import {
  formatGrossPaid,
  formatReportTime,
} from '@/features/dashboard/lib/format';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { Eye } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { type Booking } from '../schemas/bookingSchema';
export function useBookingColumns(bookingId = '') {
  const locale = useLocale();
  const t = useTranslations('Bookings');
  const states = useTranslations('States');
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [selected, setSelected] = useState<string | null>(bookingId || null);
  const open = useCallback(
    (id: string) => {
      focus.remember();
      setSelected(id);
    },
    [focus.remember],
  );
  const name = locale === 'ar' ? 'nameAr' : 'nameEn';
  const columns: DataTableColumn<Booking>[] = [
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
      id: 'route',
      header: t('route'),
      cell: ({ row }) =>
        row.original.trip.route.originStation[name] +
        (locale === 'ar' ? ' ← ' : ' → ') +
        row.original.trip.route.destinationStation[name],
    },
    {
      id: 'departure',
      header: t('departure'),
      cell: ({ row }) =>
        formatReportTime(row.original.trip.departureAt, locale),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) => states(row.original.status),
    },
    {
      id: 'amount',
      header: t('total'),
      cell: ({ row }) =>
        formatGrossPaid(String(row.original.totalPiastres), locale),
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
              onSelect: () => open(row.original.id),
            },
          ]}
        />
      ),
    },
  ];
  return {
    columns,
    focus,
    selected,
    open,
    close: () => setSelected(null),
  };
}
