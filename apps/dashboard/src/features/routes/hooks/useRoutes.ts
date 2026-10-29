'use client';
import { useState, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  getRoutesAction,
  getRouteStationsAction,
  saveRouteAction,
  deleteRouteAction,
} from '../actions/route.actions';
import { createRouteColumns, routeLabel } from '../lib/routeColumns';
import type { Route, RouteInput, RouteListQuery } from '../schemas/routeSchema';
export function useRoutes() {
  const t = useTranslations('Routes');
  const common = useTranslations('Common');
  const locale = useLocale();
  const client = useQueryClient();
  const list = useDataTableState<{
    originStationId: string;
    destinationStationId: string;
    isActive: RouteListQuery['isActive'];
  }>({
    initialFilters: {
      originStationId: '',
      destinationStationId: '',
      isActive: '',
    },
  });
  const focus = useDialogFocus();
  const [editing, setEditing] = useState<Route | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleting, setDeleting] = useState<Route | null>(null);
  const [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['routes', locale, list.params],
    queryFn: async () => {
      const [page, stations] = await Promise.all([
        invokeAction(() =>
          getRoutesAction({
            limit: list.params.limit,
            offset: list.params.offset,
            ...list.filters,
          }),
        ),
        client.fetchQuery({
          queryKey: ['catalog', locale, 'route-stations'],
          queryFn: () => invokeAction(getRouteStationsAction),
        }),
      ]);
      return { ...page, stations };
    },
  });
  const actionError = useActionErrors(query.error, {
    ROUTE_EXISTS: t('exists'),
    ROUTE_HAS_TRIPS: t('hasTrips'),
    ROUTE_IN_USE: t('inUse'),
    ROUTE_NOT_FOUND: t('notFound'),
    STATION_NOT_FOUND: t('missingStation'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async (values: RouteInput) => {
      try {
        await invokeAction(() =>
          saveRouteAction({ ...values, id: editing?.id }),
        );
        await client.invalidateQueries({ queryKey: ['routes'] });
        setEditorOpen(false);
        setNotice(t(editing ? 'updated' : 'created'));
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      try {
        await invokeAction(() => deleteRouteAction(id));
        await client.invalidateQueries({ queryKey: ['routes'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const edit = useCallback(
    (route: Route) => {
      focus.remember();
      setNotice('');
      setEditing(route);
      setEditorOpen(true);
    },
    [focus.remember],
  );
  const requestDelete = useCallback(
    (route: Route) => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setDeleting(route);
    },
    [focus.remember, confirmation.reset],
  );
  const stations = query.data?.stations ?? [];
  const columns = useMemo(
    () =>
      createRouteColumns({
        locale,
        stations,
        labels: {
          origin: t('origin'),
          destination: t('destination'),
          duration: t('duration'),
          status: t('status'),
          active: t('active'),
          inactive: t('inactive'),
          actions: common('actions'),
        },
        onEdit: edit,
        onDelete: requestDelete,
      }),
    [locale, stations, t, common, edit, requestDelete],
  );
  function create() {
    focus.remember(focus.fallbackRef.current);
    setEditing(null);
    setNotice('');
    setEditorOpen(true);
  }
  async function refresh() {
    setNotice('');
    await client.invalidateQueries({
      queryKey: ['catalog', locale, 'route-stations'],
      refetchType: 'none',
    });
    await query.refetch();
  }
  return {
    t,
    list,
    focus,
    query,
    columns,
    stations,
    notice,
    create,
    refresh,
    editing,
    editorOpen,
    save,
    closeEditor: () => {
      if (!save.isPending) setEditorOpen(false);
    },
    deleting,
    confirmation,
    closeConfirmation: () => {
      if (!confirmation.pending) setDeleting(null);
    },
    deleteName: deleting ? routeLabel(deleting, stations, locale) : '',
  };
}
