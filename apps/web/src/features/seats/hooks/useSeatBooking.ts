'use client';
import { useState, useRef, useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
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
import type { SeatList, Trip } from '@/features/trips/types/trip';

import { getTripSeatsAction } from '../actions/seats.actions';
import { seatKeys } from './queryKeys';

export function useSeatBooking(trip: Trip, initialSeats: SeatList) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Seats');
  const router = useRouter();
  const createBooking = useCreateBooking();
  const summaryRef = useRef<HTMLElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { user, status, reloadSession } = useAuth();
  const [phase, setPhase] = useState<'select' | 'details'>('select');
  useEffect(() => {
    if (phase === 'details' && window.matchMedia('(max-width: 767px)').matches)
      summaryRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [phase]);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const seatQuery = useQuery({
    queryKey: seatKeys.list(locale, initialSeats.tripId),
    queryFn: () => invokeAction(() => getTripSeatsAction(initialSeats.tripId)),
    initialData: initialSeats,
    staleTime: 0,
    refetchInterval: 15000,
  });
  const refreshSeats = () => {
    void seatQuery.refetch();
  };
  const seats = seatQuery.data.seats;
  const selected = seats.filter(
    (seat) => selectedIds.includes(seat.id) && seat.isAvailable,
  );
  function toggle(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id],
    );
    setError('');
  }
  async function reserve(input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) {
    setError('');
    if (
      !input.passengers.length ||
      input.passengers.some(
        (person) =>
          !seats.some((seat) => seat.id === person.seatId && seat.isAvailable),
      )
    ) {
      setError(t('conflict'));
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
      setError(errorMessage(cause, locale));
      if (cause instanceof ApiError && cause.code === 'SEAT_UNAVAILABLE')
        refreshSeats();
    }
  }

  useEffect(() => {
    if (phase !== 'details' || status !== 'guest') return;
    router.replace('/login');
  }, [phase, status, router]);

  return {
    user,
    status,
    reloadSession,
    phase,
    setPhase,
    summaryRef,
    error,
    uncertain,
    seatQuery,
    selectedIds,
    selected,
    toggle,
    reserve,
    refreshSeats,
  };
}
