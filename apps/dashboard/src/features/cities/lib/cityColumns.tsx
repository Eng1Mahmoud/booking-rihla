import type { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createNameColumns } from '@/shared/components/tables/NameColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import type { City, CityRow } from '../types/city';

export function createCityColumns({
  locale,
  labels,
  t,
  onEdit,
  onDelete,
}: {
  locale: string;
  labels: { nameAr: string; nameEn: string; actions: string };
  t: ReturnType<typeof useTranslations<'Cities'>>;
  onEdit: (item: City) => void;
  onDelete: (item: City) => void;
}): DataTableColumn<CityRow>[] {
  return [
    ...createNameColumns<CityRow>(locale, labels),
    {
      id: 'stationCount',
      accessorFn: (row) => row.stationCount,
      header: t('stationsTitle'),
      cell: ({ row }) => (
        <Link
          href={'/dashboard/stations?cityId=' + row.original.id}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('stationCount', { count: row.original.stationCount })}
        </Link>
      ),
    },
    {
      id: 'actions',
      header: labels.actions,
      meta: { headerClassName: 'text-end' },
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
