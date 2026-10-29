'use client';
import {
  formatGrossPaid,
  formatReportTime,
} from '@/features/dashboard/lib/format';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import { RowActions } from '@/shared/components/tables/RowActions';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import {
  cancelTripAction,
  deleteTripAction,
  saveTripAction,
} from '../actions/trip.actions';
import { type Trip, type TripInput } from '../schemas/tripSchema';
import { type TripOptions } from '../types/trip';
export function useTripColumns({
  options,
  superAdmin,
}: {
  options: TripOptions;
  superAdmin: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('Trips');
  const common = useTranslations('Common');
  const client = useQueryClient();
  const focus = useDialogFocus();
  const [editing, setEditing] = useState<Trip | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleting, setDeleting] = useState<Trip | null>(null);
  const [cancelling, setCancelling] = useState<Trip | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const save = useMutation({
    retry: false,
    mutationFn: async (values: TripInput) => {
      await invokeAction(() => saveTripAction({ ...values, id: editing?.id }));
      await client.invalidateQueries({ queryKey: ['trips'] });
      setEditorOpen(false);
      setNotice(t(editing ? 'updated' : 'created'));
    },
  });
  const remove = useMutation({
    retry: false,
    mutationFn: async (id: string) => {
      await invokeAction(() => deleteTripAction(id));
      await client.invalidateQueries({ queryKey: ['trips'] });
    },
  });
  const cancel = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!cancelling || reason.trim().length < 5 || reason.trim().length > 500)
        throw new Error(t('reasonHint'));

      await invokeAction(() =>
        cancelTripAction({ id: cancelling.id, reason: reason.trim() }),
      );
      await Promise.all(
        ['trips', 'refunds', 'payments', 'payment', 'bookings', 'booking'].map(
          (key) => client.invalidateQueries({ queryKey: [key] }),
        ),
      );
      setCancelling(null);
      setNotice(t('cancelledNotice'));
    },
  });
  const confirmation = useConfirmation(async () => {
    if (!deleting) return;
    await remove.mutateAsync(deleting.id);
    setDeleting(null);
    setNotice(t('deleted'));
  });
  const cancelConfirmation = useConfirmation(async () => {
    await cancel.mutateAsync();
  });
  const edit = useCallback(
    (trip: Trip) => {
      focus.remember();
      setNotice('');
      setEditing(trip);
      setEditorOpen(true);
    },
    [focus.remember],
  );
  const requestDelete = useCallback(
    (trip: Trip) => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setDeleting(trip);
    },
    [focus.remember, confirmation.reset],
  );
  const requestCancel = useCallback(
    (trip: Trip) => {
      focus.remember();
      cancelConfirmation.reset();
      setReason('');
      setCancelling(trip);
    },
    [focus.remember, cancelConfirmation.reset],
  );

  const name = (trip: Trip) => {
    const route = options.routes.find((route) => route.id === trip.routeId);
    return route ? routeLabel(route, options.stations, locale) : trip.routeId;
  };
  const columns: DataTableColumn<Trip>[] = [
    {
      id: 'route',
      header: t('route'),
      meta: { headerClassName: 'w-60' },
      cell: ({ row }) => name(row.original),
    },
    {
      id: 'bus',
      header: t('bus'),
      cell: ({ row }) => (
        <bdi>
          {options.buses.find((bus) => bus.id === row.original.busId)
            ?.plateNumber ?? row.original.busId}
        </bdi>
      ),
    },
    {
      id: 'departure',
      header: t('departure'),
      cell: ({ row }) => formatReportTime(row.original.departureAt, locale),
    },
    {
      id: 'arrival',
      header: t('arrival'),
      cell: ({ row }) => formatReportTime(row.original.arrivalAt, locale),
    },
    {
      id: 'price',
      header: t('price'),
      cell: ({ row }) =>
        formatGrossPaid(String(row.original.pricePiastres), locale),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) =>
        row.original.status === 'SCHEDULED' ? t('scheduled') : t('cancelled'),
    },
    {
      id: 'actions',
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => {
        const trip = row.original;
        const closed =
          trip.status === 'CANCELLED' ||
          Date.parse(trip.departureAt) <= Date.now();
        if (closed)
          return (
            <span className="text-sm text-muted-foreground">{t('closed')}</span>
          );
        return (
          <RowActions
            name={name(trip)}
            onEdit={() => edit(trip)}
            onDelete={() => requestDelete(trip)}
            additionalActions={
              superAdmin
                ? [
                    {
                      label: t('cancel'),
                      icon: Ban,
                      destructive: true,
                      onSelect: () => requestCancel(trip),
                    },
                  ]
                : []
            }
          />
        );
      },
    },
  ];
  function create() {
    focus.remember(focus.fallbackRef.current);
    setEditing(null);
    setNotice('');
    setEditorOpen(true);
  }
  return {
    t,
    focus,
    columns,
    notice,
    clearNotice: () => setNotice(''),
    create,
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
    cancelling,
    reason,
    setReason,
    cancelConfirmation,
    closeCancellation: () => {
      if (!cancelConfirmation.pending) setCancelling(null);
    },
  };
}
