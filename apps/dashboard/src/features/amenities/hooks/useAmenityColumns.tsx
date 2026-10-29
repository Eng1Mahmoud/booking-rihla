'use client';
import { getNameColumns } from '@/shared/components/tables/NameColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import {
  deleteAmenityAction,
  saveAmenityAction,
} from '../actions/amenity.actions';
import { type AmenityInput } from '../schemas/amenitySchema';
import { type Amenity } from '../types/amenity';
export function useAmenityColumns() {
  const locale = useLocale();
  const t = useTranslations('Amenities');
  const common = useTranslations('Common');
  const client = useQueryClient();
  const saveMutation = useMutation({
    retry: false,
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string;
      values: AmenityInput;
    }) => {
      await invokeAction(() => saveAmenityAction({ ...values, id }));
      await client.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteAmenityAction(id));
      await client.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Amenity | null>(null);
  const [deleting, setDeleting] = useState<Amenity | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const openEdit = useCallback(
    (entry: Amenity) => {
      focus.remember();
      setEditing(entry);
      setNotice('');
      setEditorOpen(true);
    },
    [focus.remember],
  );
  const openDelete = useCallback(
    (entry: Amenity) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const columns: DataTableColumn<Amenity>[] = [
    ...getNameColumns<Amenity>(locale, {
      nameAr: common('nameAr'),
      nameEn: common('nameEn'),
    }),
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
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={row.original[locale === 'ar' ? 'nameAr' : 'nameEn']}
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
  async function saveEntry(values: AmenityInput) {
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
      name: deleting?.[locale === 'ar' ? 'nameAr' : 'nameEn'] ?? '',
      pending: confirmation.pending,
      error: confirmation.error,
      onConfirm: confirmation.confirm,
      onCancel: closeConfirmation,
    },
  };
}
