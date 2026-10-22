'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCreateBooking } from '@/features/bookings/hooks/useBookings';
import {
  ApiError,
  isUncertainRequestError,
  errorMessage,
} from '@/shared/lib/apiResult';
import type { SeatList, Trip } from '@/features/trips/types/trip';
import { useSeatSelection } from './useSeatSelection';

/**
 * Booking flow on the trip page: selection phase, guest login, reserve.
 */
export function useSeatBooking(trip: Trip, initialSeats: SeatList) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Seats');
  const router = useRouter();
  const createBooking = useCreateBooking();
  const summaryRef = useRef<HTMLElement>(null);
  const { user, status, reloadSession } = useAuth();
  const [phase, setPhase] = useState<'select' | 'details'>('select');
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);

  const selection = useSeatSelection(initialSeats);
  const {
    selectedIds,
    selected,
    seats,
    availabilityNotice,
    setAvailabilityNotice,
    toggle,
    clearSelection,
    refreshSeats,
    seatQuery,
  } = selection;

  // Mobile scroll + move focus into the summary when opening details.
  useEffect(() => {
    if (phase !== 'details') return;
    if (window.matchMedia('(max-width: 767px)').matches)
      summaryRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    summaryRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // After login with ?seats= restored, open details when signed in.
  useEffect(() => {
    if (status !== 'signed-in' || phase !== 'select') return;
    if (!selectedIds.length) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (!params.get('seats')) return;
    setPhase('details');
  }, [status, selectedIds.length, phase]);

  useEffect(() => {
    if (phase === 'details' && selectedIds.length === 0) setPhase('select');
  }, [phase, selectedIds.length]);

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

  function onToggle(id: string) {
    toggle(id);
    setError('');
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
      clearSelection();
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
    toggle: onToggle,
    reserve,
    refreshSeats,
  };
}
