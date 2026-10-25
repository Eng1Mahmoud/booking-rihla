import type { useTranslations } from 'next-intl';
import { RowActions } from '@/shared/components/tables/RowActions';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import type { Bus } from '../types/bus';
export function createBusColumns({
  locale,
  labels,
  t,
  onEdit,
  onDelete,
}: {
  locale: string;
  labels: { actions: string };
  t: ReturnType<typeof useTranslations<'Buses'>>;
  onEdit: (bus: Bus) => void;
  onDelete: (bus: Bus) => void;
}): DataTableColumn<Bus>[] {
  const name = locale === 'ar' ? 'nameAr' : 'nameEn';
  return [
    {
      id: 'plateNumber',
      header: t('plateNumber'),
      cell: ({ row }) => (
        <bdi className="font-semibold break-all">
          {row.original.plateNumber}
        </bdi>
      ),
    },
    {
      id: 'busType',
      header: t('busType'),
      cell: ({ row }) => row.original.busType?.[name] ?? t('noType'),
    },
    {
      id: 'seatCount',
      header: t('seatCount'),
      cell: ({ row }) => t('seats', { count: row.original.seatCount }),
    },
    {
      id: 'seatLayout',
      header: t('seatLayout'),
      cell: ({ row }) =>
        t(row.original.seatLayout ? 'standardLayout' : 'numberedLayout'),
    },
    {
      id: 'isActive',
      header: t('status'),
      cell: ({ row }) => t(row.original.isActive ? 'active' : 'inactive'),
    },
    {
      id: 'amenities',
      header: t('amenities'),
      cell: ({ row }) =>
        row.original.amenities
          .map((item) => item[name])
          .join(locale === 'ar' ? '، ' : ', ') || t('noAmenities'),
    },
    {
      id: 'actions',
      header: labels.actions,
      meta: { headerClassName: 'text-end' },
      cell: ({ row }) => (
        <RowActions
          name={row.original.plateNumber}
          onEdit={() => onEdit(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
  ];
}
