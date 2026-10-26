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
  getTripsAction,
  getTripOptionsAction,
  saveTripAction,
  deleteTripAction,
  cancelTripAction,
} from '../actions/trip.actions';
import { createTripColumns } from '../lib/tripColumns';
import type { Trip, TripInput, TripListQuery } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';
const emptyOptions: TripOptions = { routes: [], stations: [], buses: [] };
export function useTrips(superAdmin: boolean) {
  const t = useTranslations('Trips'),
    common = useTranslations('Common'),
    locale = useLocale(),
    client = useQueryClient();
  const list = useDataTableState<{
    routeId: string;
    busId: string;
    status: TripListQuery['status'];
  }>({ initialFilters: { routeId: '', busId: '', status: '' } });
  const focus = useDialogFocus();
  const [editing, setEditing] = useState<Trip | null>(null),
    [editorOpen, setEditorOpen] = useState(false),
    [deleting, setDeleting] = useState<Trip | null>(null),
    [cancelling, setCancelling] = useState<Trip | null>(null),
    [reason, setReason] = useState(''),
    [notice, setNotice] = useState('');
  const query = useQuery({
    queryKey: ['trips', locale, list.params],
    queryFn: async () => {
      const [page, options] = await Promise.all([
        invokeAction(() =>
          getTripsAction({
            limit: list.params.limit,
            offset: list.params.offset,
            ...list.filters,
          }),
        ),
        client.fetchQuery({
          queryKey: ['catalog', locale, 'trip-options'],
          queryFn: () => invokeAction(getTripOptionsAction),
        }),
      ]);
      return { ...page, options };
    },
  });
  const actionError = useActionErrors(query.error, {
    TRIP_HAS_BOOKINGS: t('hasBookings'),
    TRIP_IN_USE: t('inUse'),
    TRIP_REFERENCE_NOT_FOUND: t('missingOption'),
    TRIP_NOT_FOUND: t('notFound'),
    TRIP_DEPARTED: t('departed'),
    TRIP_CANCELLED: t('alreadyCancelled'),
    BUS_SCHEDULE_CONFLICT: t('conflict'),
    BUS_INACTIVE: t('inactive'),
    ROUTE_INACTIVE: t('inactive'),
    PAYMENTS_UNRESOLVED: t('unresolved'),
  });
  const save = useMutation({
    retry: false,
    mutationFn: async (values: TripInput) => {
      try {
        await invokeAction(() =>
          saveTripAction({ ...values, id: editing?.id }),
        );
        await client.invalidateQueries({ queryKey: ['trips'] });
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
        await invokeAction(() => deleteTripAction(id));
        await client.invalidateQueries({ queryKey: ['trips'] });
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const cancel = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!cancelling || reason.trim().length < 5 || reason.trim().length > 500)
        throw new Error(t('reasonHint'));
      try {
        await invokeAction(() =>
          cancelTripAction({ id: cancelling.id, reason: reason.trim() }),
        );
        await Promise.all(
          [
            'trips',
            'refunds',
            'payments',
            'payment',
            'bookings',
            'booking',
          ].map((key) => client.invalidateQueries({ queryKey: [key] })),
        );
        setCancelling(null);
        setNotice(t('cancelledNotice'));
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
  const options = query.data?.options ?? emptyOptions;
  const columns = useMemo(() => {
    const labels = Object.fromEntries(
      [
        'route',
        'bus',
        'departure',
        'arrival',
        'price',
        'status',
        'scheduled',
        'cancelled',
        'cancel',
        'closed',
      ].map((key) => [key, t(key)]),
    );
    labels.actions = common('actions');
    return createTripColumns({
      locale,
      options,
      labels,
      onEdit: edit,
      onDelete: requestDelete,
      onCancel: requestCancel,
      superAdmin,
    });
  }, [
    locale,
    options,
    t,
    common,
    edit,
    requestDelete,
    requestCancel,
    superAdmin,
  ]);

  function create() {
    focus.remember(focus.fallbackRef.current);
    setEditing(null);
    setNotice('');
    setEditorOpen(true);
  }
  async function refresh() {
    setNotice('');
    await client.invalidateQueries({
      queryKey: ['catalog', locale, 'trip-options'],
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
    options,
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
    cancelling,
    reason,
    setReason,
    cancelConfirmation,
    closeCancellation: () => {
      if (!cancelConfirmation.pending) setCancelling(null);
    },
  };
}
