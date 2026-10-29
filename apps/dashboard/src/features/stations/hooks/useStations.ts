'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useStationsData } from './useStationsData';
import { createStationColumns } from '../lib/stationColumns';
import type { StationInput } from '../schemas/stationSchema';
import type { Station } from '../types/station';

export function useStations(cityId: string) {
  const t = useTranslations('Stations');
  const common = useTranslations('Common');
  const locale = useLocale();
  const list = useDataTableState({ initialFilters: { cityId } });
  const router = useRouter();
  const [filterPending, startFilterTransition] = useTransition();
  const { setFilter } = list;
  useEffect(() => setFilter('cityId', cityId), [cityId, setFilter]);
  const data = useStationsData(list.params);
  const focus = useDialogFocus();
  const [notice, setNotice] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [deleting, setDeleting] = useState<Station | null>(null);
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    setNotice('');
    await data.remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const openEdit = useCallback(
    (entry: Station) => {
      focus.remember();
      setEditing(entry);
      setNotice('');
      setEditorOpen(true);
    },
    [focus.remember],
  );
  const openDelete = useCallback(
    (entry: Station) => {
      focus.remember();
      confirmation.reset();
      setDeleting(entry);
      setNotice('');
    },
    [focus.remember, confirmation.reset],
  );
  const columns = useMemo(
    () =>
      createStationColumns({
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
  async function save(values: StationInput) {
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
  function changeCity(nextCityId: string) {
    list.setFilter('cityId', nextCityId);
    startFilterTransition(() =>
      router.replace(
        '/dashboard/stations' + (nextCityId ? '?cityId=' + nextCityId : ''),
        { scroll: false },
      ),
    );
  }
  function resetFilters() {
    list.resetFilters({ cityId: '' });
    if (list.filters.cityId || cityId) changeCity('');
  }
  return {
    list,
    query: data.query,
    columns,
    notice,
    openCreate,
    refresh,
    focus,
    canAdd: Boolean(data.query.data && data.cities.length),
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
    cities: data.cities,
    filterPending,
    changeCity,
    resetFilters,
  };
}
