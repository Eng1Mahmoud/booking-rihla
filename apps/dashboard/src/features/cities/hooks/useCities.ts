'use client';
import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useCitiesData } from './useCitiesData';
import { createCityColumns } from '../lib/cityColumns';
import type { CityInput } from '../schemas/citySchema';
import type { City } from '../types/city';

export function useCities() {
  const t = useTranslations('Cities');
  const common = useTranslations('Common');
  const locale = useLocale();
  const list = useDataTableState({ initialFilters: {} });

  const data = useCitiesData(list.params);
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<City | null>(null);
  const [deleting, setDeleting] = useState<City | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await data.remove.mutateAsync(deleting.id);
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
  const columns = useMemo(
    () =>
      createCityColumns({
        locale,
        t,
        labels: {
          nameAr: common('nameAr'),
          nameEn: common('nameEn'),
          actions: common('actions'),
        },
        onEdit: openEdit,
        onDelete: openDelete,
      }),
    [locale, t, common, openEdit, openDelete],
  );
  function openCreate() {
    focus.remember(focus.fallbackRef.current);
    setEditing(null);
    setNotice('');
    setEditorOpen(true);
  }
  async function save(values: CityInput) {
    setNotice('');
    await data.save.mutateAsync({ id: editing?.id, values });
    setEditorOpen(false);
    setNotice(t(editing ? 'updated' : 'created'));
  }
  function closeEditor() {
    if (!data.save.isPending) setEditorOpen(false);
  }
  function closeConfirmation() {
    if (!confirmation.pending) setDeleting(null);
  }
  function refresh() {
    setNotice('');
    void data.refresh();
  }

  return {
    list,
    query: data.query,
    columns,
    notice,
    openCreate,
    refresh,
    focus,
    canAdd: Boolean(data.query.data),
    editorOpen,
    editor: {
      entry: editing,
      pending: data.save.isPending,
      onSave: save,
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
