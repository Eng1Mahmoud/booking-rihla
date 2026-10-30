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
import { deleteRouteAction } from '../actions/route.actions';
import {
  routeLabel,
  stationLabel,
  type RouteStation,
} from '../lib/routeColumns';
import { type Route } from '../schemas/routeSchema';
export function useRouteColumns({ stations }: { stations: RouteStation[] }) {
  const urlParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations('Routes');
  const common = useTranslations('Common');
  const client = useQueryClient();
  const focus = useDialogFocus();

  const [deleting, setDeleting] = useState<Route | null>(null);
  const [notice, setNotice] = useState('');

  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteRouteAction(id));
      await client.invalidateQueries({ queryKey: ['routes'] });
    },
  });
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });

  const requestDelete = useCallback(
    (route: Route) => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setDeleting(route);
    },
    [focus.remember, confirmation.reset],
  );

  const name = (id: string) => {
    const station = stations.find((s) => s.id === id);
    return station ? stationLabel(station, locale) : id;
  };
  const columns: DataTableColumn<Route>[] = [
    {
      id: 'origin',
      header: t('origin'),
      cell: ({ row }) => name(row.original.originStationId),
    },
    {
      id: 'destination',
      header: t('destination'),
      cell: ({ row }) => name(row.original.destinationStationId),
    },
    {
      id: 'duration',
      header: t('duration'),
      cell: ({ row }) =>
        new Intl.NumberFormat(locale).format(
          row.original.estimatedDurationMinutes,
        ),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) => (row.original.isActive ? t('active') : t('inactive')),
    },
    {
      id: 'actions',
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={routeLabel(row.original, stations, locale)}
          editHref={
            '/dashboard/routes/' +
            encodeURIComponent(row.original.id) +
            '/edit?' +
            urlParams.toString()
          }
          onDelete={() => requestDelete(row.original)}
        />
      ),
    },
  ];

  return {
    t,
    focus,
    columns,
    notice,
    clearNotice: () => setNotice(''),
    deleting,
    confirmation,
    closeConfirmation: () => {
      if (!confirmation.pending) setDeleting(null);
    },
    deleteName: deleting ? routeLabel(deleting, stations, locale) : '',
  };
}
