'use client';
import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useBusTypesData } from './useBusTypesData';
import { createBusTypeColumns } from '../lib/busTypeColumns';
import type { BusTypeInput } from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export function useBusTypes() {
  const t = useTranslations('BusTypes');
  const common = useTranslations('Common');
  const locale = useLocale();
  const list = useDataTableState({ initialFilters: {} });

  const data = useBusTypesData(list.params);
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BusType | null>(null);
  const [deleting, setDeleting] = useState<BusType | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await data.remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const openEdit = useCallback(
    (entry: BusType) => {
      focus.remember();
      setEditing(entry);
      setNotice('');
      setEditorOpen(true);
    },
    [focus.remember],
  );
  const openDelete = useCallback(
    (entry: BusType) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const columns = useMemo(
    () =>
      createBusTypeColumns({
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
  async function save(values: BusTypeInput) {
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
