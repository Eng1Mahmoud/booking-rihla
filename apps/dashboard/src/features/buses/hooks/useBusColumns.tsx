'use client';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { deleteBusAction, saveBusAction } from '../actions/bus.actions';
import { type BusInput } from '../schemas/busSchema';
import { type Bus } from '../types/bus';
export function useBusColumns() {
  const locale = useLocale();
  const t = useTranslations('Buses');
  const common = useTranslations('Common');
  const client = useQueryClient();
  const saveMutation = useMutation({
    retry: false,
    mutationFn: async ({ id, values }: { id?: string; values: BusInput }) => {
      await invokeAction(() => saveBusAction({ ...values, id }));
      await client.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteBusAction(id));
      await client.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Bus | null>(null);
  const [deleting, setDeleting] = useState<Bus | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const openEdit = useCallback(
    (entry: Bus) => {
      focus.remember();
      setEditing(entry);
      setNotice('');
      setEditorOpen(true);
    },
    [focus.remember],
  );
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
          onEdit={() => openEdit(row.original)}
          onDelete={() => openDelete(row.original)}
        />
      ),
    },
  ];
  function openCreate() {
    focus.remember(focus.fallbackRef.current);
    setEditing(null);
    setNotice('');
    setEditorOpen(true);
  }
  async function saveEntry(values: BusInput) {
    setNotice('');
    await saveMutation.mutateAsync({ id: editing?.id, values });
    setEditorOpen(false);
    setNotice(t(editing ? 'updated' : 'created'));
  }
  function closeEditor() {
    if (!saveMutation.isPending) setEditorOpen(false);
  }
  function closeConfirmation() {
    if (!confirmation.pending) setDeleting(null);
  }
  return {
    columns,
    notice,
    clearNotice: () => setNotice(''),
    openCreate,
    focus,
    editorOpen,
    editor: {
      entry: editing,
      pending: saveMutation.isPending,
      onSave: saveEntry,
      onClose: closeEditor,
    },
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
