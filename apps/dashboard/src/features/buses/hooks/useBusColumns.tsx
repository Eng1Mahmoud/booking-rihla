'use client';
import { useSearchParams } from 'next/navigation';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { deleteBusAction } from '../actions/bus.actions';
import { type Bus } from '../types/bus';
export function useBusColumns() {
  const urlParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Buses');
  const common = useTranslations('Common');
  const client = useQueryClient();

  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteBusAction(id));
      await client.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');

  const [deleting, setDeleting] = useState<Bus | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });

  const openDelete = useCallback(
    (entry: Bus) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const name = locale === 'ar' ? 'nameAr' : 'nameEn';
  const columns: DataTableColumn<Bus>[] = [
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
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={row.original.plateNumber}
          editHref={
            '/dashboard/buses/' +
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
      name: deleting?.plateNumber ?? '',
      pending: confirmation.pending,
      error: confirmation.error,
      onConfirm: confirmation.confirm,
      onCancel: closeConfirmation,
    },
  };
}
