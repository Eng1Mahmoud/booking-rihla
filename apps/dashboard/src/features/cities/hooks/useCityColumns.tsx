'use client';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getNameColumns } from '@/shared/components/tables/NameColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { deleteCityAction } from '../actions/city.actions';
import type { City, CityRow } from '../types/city';

export function useCityColumns() {
  const urlParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Cities');
  const common = useTranslations('Common');
  const client = useQueryClient();

  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteCityAction(id));
      await client.invalidateQueries({ queryKey: ['locations'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');

  const [deleting, setDeleting] = useState<City | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });

  const openDelete = useCallback(
    (entry: City) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const columns: DataTableColumn<CityRow>[] = [
    ...getNameColumns<CityRow>(locale, {
      nameAr: common('nameAr'),
      nameEn: common('nameEn'),
    }),
    {
      id: 'stationCount',
      accessorFn: (row) => row.stationCount,
      header: t('stationsTitle'),
      cell: ({ row }) => (
        <Link
          href={'/dashboard/stations?filter.cityId=' + row.original.id}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t('stationCount', { count: row.original.stationCount })}
        </Link>
      ),
    },
    {
      id: 'actions',
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={row.original[locale === 'ar' ? 'nameAr' : 'nameEn']}
          editHref={
            '/dashboard/cities/' +
            encodeURIComponent(row.original.id) +
            '/edit?' +
            urlParams.toString()
          }
          onDelete={() => openDelete(row.original)}
        />
      ),
    },
  ];

  function closeConfirmation() {
    if (!confirmation.pending) setDeleting(null);
  }
  return {
    columns,
    notice,
    clearNotice: () => setNotice(''),
    focus,
    confirmation: {
      open: Boolean(deleting),
      name: deleting?.[locale === 'ar' ? 'nameAr' : 'nameEn'] ?? '',
      pending: confirmation.pending,
      error: confirmation.error,
      onConfirm: confirmation.confirm,
      onCancel: closeConfirmation,
    },
  };
}
