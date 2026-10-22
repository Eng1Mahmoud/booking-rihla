'use client';
import { useState, useRef, useEffect, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateBooking } from '@/features/bookings/hooks/useBookings';
import {
  ApiError,
  invokeAction,
  isUncertainRequestError,
  errorMessage,
} from '@/shared/lib/apiResult';
import type { Seat, SeatList, Trip } from '@/features/trips/types/trip';

import { getTripSeatsAction } from '../actions/seats.actions';
import { seatKeys } from './queryKeys';

function seatIdsFromQuery(value: string | null, seats: Seat[]) {
  if (!value) return [] as string[];
  const available = new Set(
    seats.filter((seat) => seat.isAvailable).map((seat) => seat.id),
  );
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const part of value.split(',')) {
    const id = part.trim();
    if (!id || seen.has(id) || !available.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function useSeatBooking(trip: Trip, initialSeats: SeatList) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Seats');
  const router = useRouter();
  const searchParams = useSearchParams();
  const createBooking = useCreateBooking();
  const summaryRef = useRef<HTMLElement>(null);
  const restoredRef = useRef(false);

  const initialSelected = useMemo(
    () => seatIdsFromQuery(searchParams.get('seats'), initialSeats.seats),
    // Only seed from the first URL; later query changes are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelected);
  const { user, status, reloadSession } = useAuth();
  const [phase, setPhase] = useState<'select' | 'details'>('select');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [availabilityNotice, setAvailabilityNotice] = useState('');

  useEffect(() => {
    if (phase === 'details' && window.matchMedia('(max-width: 767px)').matches)
      summaryRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [phase]);

  const seatQuery = useQuery({
    queryKey: seatKeys.list(locale, initialSeats.tripId),
    queryFn: () => invokeAction(() => getTripSeatsAction(initialSeats.tripId)),
    initialData: initialSeats,
    staleTime: 0,
    refetchInterval: 15000,
  });

  const seats = seatQuery.data.seats;

  // After login return: keep restored seats and open passenger details when signed in.
  useEffect(() => {
    if (restoredRef.current || status === 'loading') return;
    const fromQuery = seatIdsFromQuery(searchParams.get('seats'), seats);
    if (!fromQuery.length) {
      restoredRef.current = true;
      return;
    }
    setSelectedIds(fromQuery);
    if (status === 'signed-in') setPhase('details');
    restoredRef.current = true;
  }, [status, seats, searchParams]);

  useEffect(() => {
    const availableIds = new Set(
      seats.filter((seat) => seat.isAvailable).map((seat) => seat.id),
    );
    setSelectedIds((ids) => {
      const next = ids.filter((id) => availableIds.has(id));
      if (next.length === ids.length) return ids;
      setAvailabilityNotice(t('changed'));
      if (next.length === 0) setPhase('select');
      return next;
    });
  }, [seatQuery.dataUpdatedAt, seats, t]);

  const refreshSeats = () => {
    void seatQuery.refetch();
  };

  const selected = seats.filter(
    (seat) => selectedIds.includes(seat.id) && seat.isAvailable,
  );

  function toggle(id: string) {
    const seat = seats.find((item) => item.id === id);
    if (!seat) return;
    if (!seat.isAvailable && !selectedIds.includes(id)) return;

    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
    setError('');
    setAvailabilityNotice('');
  }

  async function reserve(input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) {
    setError('');
    setUncertain(false);
    if (
      !input.passengers.length ||
      input.passengers.some(
        (person) =>
          !seats.some((seat) => seat.id === person.seatId && seat.isAvailable),
      )
    ) {
      setError(t('conflict'));
      setAvailabilityNotice(t('changed'));
      setPhase('select');
      refreshSeats();
      return;
    }
    try {
      const result = await createBooking.mutateAsync({
        tripId: trip.id,
        ...input,
      });
      setSelectedIds([]);
      router.push('/bookings/' + result.id);
    } catch (cause) {
      if (isUncertainRequestError(cause)) {
        setUncertain(true);
        setError(t('uncertain'));
        return;
      }
      if (cause instanceof ApiError && cause.code === 'SEAT_UNAVAILABLE') {
        setError(t('conflict'));
        setAvailabilityNotice(t('changed'));
        setPhase('select');
        refreshSeats();
        return;
      }
      setError(errorMessage(cause, locale));
    }
  }

  // Guest continuing to passenger details → login, then back to this trip.
  useEffect(() => {
    if (phase !== 'details' || status !== 'guest') return;
    const returnTo =
      '/trips/' +
      trip.id +
      (selectedIds.length
        ? '?seats=' + encodeURIComponent(selectedIds.join(','))
        : '');
    router.replace('/login?returnTo=' + encodeURIComponent(returnTo));
  }, [phase, status, selectedIds, trip.id, router]);

  return {
    user,
    status,
    reloadSession,
    phase,
    setPhase,
    summaryRef,
    error,
    uncertain,
    availabilityNotice,
    seatQuery,
    selectedIds,
    selected,
    toggle,
    reserve,
    refreshSeats,
  };
}
