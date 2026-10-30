'use client';
import { useSearchParams } from 'next/navigation';
import { getNameColumns } from '@/shared/components/tables/NameColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { deleteStationAction } from '../actions/station.actions';
import { type Station, type StationRow } from '../types/station';
export function useStationColumns() {
  const urlParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Stations');
  const common = useTranslations('Common');
  const client = useQueryClient();

  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteStationAction(id));
      await client.invalidateQueries({ queryKey: ['locations'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');

  const [deleting, setDeleting] = useState<Station | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });

  const openDelete = useCallback(
    (entry: Station) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const columns: DataTableColumn<StationRow>[] = [
    ...getNameColumns<StationRow>(locale, {
      nameAr: common('nameAr'),
      nameEn: common('nameEn'),
    }),
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
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={row.original[locale === 'ar' ? 'nameAr' : 'nameEn']}
          editHref={
            '/dashboard/stations/' +
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
