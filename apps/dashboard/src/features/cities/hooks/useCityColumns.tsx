'use client';
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
import { deleteCityAction, saveCityAction } from '../actions/city.actions';
import type { CityInput } from '../schemas/citySchema';
import type { City, CityRow } from '../types/city';

export function useCityColumns() {
  const locale = useLocale();
  const t = useTranslations('Cities');
  const common = useTranslations('Common');
  const client = useQueryClient();
  const saveMutation = useMutation({
    retry: false,
    mutationFn: async ({ id, values }: { id?: string; values: CityInput }) => {
      await invokeAction(() => saveCityAction({ ...values, id }));
      await client.invalidateQueries({ queryKey: ['locations'] });
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteCityAction(id));
      await client.invalidateQueries({ queryKey: ['locations'] });
    },
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [deleting, setDeleting] = useState<City | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const openEdit = useCallback(
    (entry: City) => {
      focus.remember();
      setEditing(entry);
      setNotice('');
      setEditorOpen(true);
    },
    [focus.remember],
  );
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
          href={'/dashboard/stations?cityId=' + row.original.id}
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
  async function saveCity(values: CityInput) {
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
      onSave: saveCity,
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
