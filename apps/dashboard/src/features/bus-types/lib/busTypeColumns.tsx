import type { useTranslations } from 'next-intl';
import { createNameColumns, RowActions } from '@/shared/components/tables';
import type { DataTableColumn } from '@/shared/lib';
import type { BusType } from '../types/busType';

export function createBusTypeColumns({
  locale,
  labels,
  t,
  onEdit,
  onDelete,
}: {
  locale: string;
  labels: { nameAr: string; nameEn: string; actions: string };
  t: ReturnType<typeof useTranslations<'BusTypes'>>;
  onEdit: (item: BusType) => void;
  onDelete: (item: BusType) => void;
}): DataTableColumn<BusType>[] {
  return [
    ...createNameColumns<BusType>(locale, labels),
    {
      id: 'code',
      accessorFn: (row) => row.code,
      header: t('code'),
      cell: ({ row }) => (
        <span dir="ltr" className="inline-block">
          {row.original.code}
        </span>
      ),
    },
    {
      id: 'actions',
      header: labels.actions,
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={row.original[locale === 'ar' ? 'nameAr' : 'nameEn']}
          onEdit={() => onEdit(row.original)}
          onDelete={() => onDelete(row.original)}
        />
      ),
    },
  ];
}
