'use client';
import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useDataTableState,
  useConfirmation,
  useDialogFocus,
} from '@/shared/hooks';
import { useBusesData } from './useBusesData';
import { createBusColumns } from '../lib/busColumns';
import type { BusInput } from '../schemas/busSchema';
import type { Bus } from '../types/bus';

export function useBuses() {
  const t = useTranslations('Buses');
  const common = useTranslations('Common');
  const locale = useLocale();
  const list = useDataTableState<{
    busTypeId: string;
    isActive: '' | 'true' | 'false';
  }>({ initialFilters: { busTypeId: '', isActive: '' } });

  const data = useBusesData({
    search: list.params.search,
    limit: list.params.limit,
    offset: list.params.offset,
    busTypeId: list.filters.busTypeId,
    isActive: list.filters.isActive,
  });
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Bus | null>(null);
  const [deleting, setDeleting] = useState<Bus | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await data.remove.mutateAsync(deleting.id);
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
  const columns = useMemo(
    () =>
      createBusColumns({
        locale,
        t,
        labels: {
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
  async function save(values: BusInput) {
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
      options: data.query.data?.options ?? { busTypes: [], amenities: [] },
      pending: data.save.isPending,
      onSave: save,
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
