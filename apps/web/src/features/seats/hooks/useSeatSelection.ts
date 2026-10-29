'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { invokeAction } from '@/shared/lib/apiResult';
import type { SeatList } from '@/features/trips/types/trip';
import { getTripSeatsAction } from '../actions/seats.actions';
import { availableSeatsByIds, seatIdsFromQuery } from '../lib/seatSelection';

/**
 * Seat map state: poll availability, selection, URL restore, auto-prune.
 */
export function useSeatSelection(initialSeats: SeatList) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Seats');
  const searchParams = useSearchParams();
  const restoredRef = useRef(false);

  const initialSelected = useMemo(
    () => seatIdsFromQuery(searchParams.get('seats'), initialSeats.seats),
    // Seed once from the first URL only.
    [],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
  const [availabilityNotice, setAvailabilityNotice] = useState('');

  const seatQuery = useQuery({
    queryKey: ['seats', 'list', locale, initialSeats.tripId],
    queryFn: () => invokeAction(() => getTripSeatsAction(initialSeats.tripId)),
    initialData: initialSeats,
    staleTime: 0,
    refetchInterval: 15000,
  });

  const seats = seatQuery.data.seats;

  // Restore selection from ?seats= after login (once).
  useEffect(() => {
    if (restoredRef.current) return;
    const fromQuery = seatIdsFromQuery(searchParams.get('seats'), seats);
    if (fromQuery.length) setSelectedIds(fromQuery);
    restoredRef.current = true;
  }, [seats, searchParams]);

  // Drop seats that became unavailable after a poll/refresh.
  useEffect(() => {
    const availableIds = new Set(
      seats.filter((seat) => seat.isAvailable).map((seat) => seat.id),
    );
    setSelectedIds((ids) => {
      const next = ids.filter((id) => availableIds.has(id));
      if (next.length === ids.length) return ids;
      setAvailabilityNotice(t('changed'));
      return next;
    });
  }, [seatQuery.dataUpdatedAt, seats, t]);

  const selected = availableSeatsByIds(seats, selectedIds);

  function toggle(id: string) {
    const seat = seats.find((item) => item.id === id);
    if (!seat) return;
    if (!seat.isAvailable && !selectedIds.includes(id)) return;
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
    setAvailabilityNotice('');
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  function refreshSeats() {
    void seatQuery.refetch();
  }

  return {
    seatQuery,
    seats,
    selectedIds,
    selected,
    availabilityNotice,
    setAvailabilityNotice,
    toggle,
    clearSelection,
    refreshSeats,
  };
}
