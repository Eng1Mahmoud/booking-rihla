import type { useTranslations } from 'next-intl';
import { createNameColumns, RowActions } from '@/shared/components/tables';
import type { DataTableColumn } from '@/shared/lib';
import type { Station, StationRow } from '../types/station';

export function createStationColumns({
  locale,
  labels,
  t,
  onEdit,
  onDelete,
}: {
  locale: string;
  labels: { nameAr: string; nameEn: string; actions: string };
  t: ReturnType<typeof useTranslations<'Stations'>>;
  onEdit: (item: Station) => void;
  onDelete: (item: Station) => void;
}): DataTableColumn<StationRow>[] {
  return [
    ...createNameColumns<StationRow>(locale, labels),
    {
      id: 'cityId',
      accessorFn: (row) => row.cityId,
      header: t('city'),
      cell: ({ row }) => (
        <span className="block wrap-anywhere text-muted-foreground">
          {row.original.city[locale === 'ar' ? 'nameAr' : 'nameEn'] ||
            t('missingCity')}
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
