import { type DataTableColumn, cn } from '@/shared/lib';

export function createNameColumns<T extends { nameAr: string; nameEn: string }>(
  locale: string,
  labels: { nameAr: string; nameEn: string },
): DataTableColumn<T>[] {
  return [
    {
      id: 'nameAr',
      accessorFn: (row) => row.nameAr,
      header: labels.nameAr,
      cell: ({ row }) => (
        <span
          lang="ar"
          dir="rtl"
          className={cn(
            'block wrap-anywhere',
            locale === 'ar' && 'font-semibold',
          )}
        >
          {row.original.nameAr}
        </span>
      ),
    },
    {
      id: 'nameEn',
      accessorFn: (row) => row.nameEn,
      header: labels.nameEn,
      cell: ({ row }) => (
        <span
          lang="en"
          dir="ltr"
          className={cn(
            'block wrap-anywhere',
            locale === 'en' && 'font-semibold',
          )}
        >
          {row.original.nameEn}
        </span>
      ),
    },
  ];
}
