import type { useTranslations } from 'next-intl';
import { createNameColumns } from '@/shared/components/tables/NameColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import type { Amenity } from '../types/amenity';

export function createAmenityColumns({
  locale,
  labels,
  t,
  onEdit,
  onDelete,
}: {
  locale: string;
  labels: { nameAr: string; nameEn: string; actions: string };
  t: ReturnType<typeof useTranslations<'Amenities'>>;
  onEdit: (item: Amenity) => void;
  onDelete: (item: Amenity) => void;
}): DataTableColumn<Amenity>[] {
  return [
    ...createNameColumns<Amenity>(locale, labels),
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
