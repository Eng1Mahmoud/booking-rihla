'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from 'zustand';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { createBookingStore } from '@/stores/booking-store';
import { useSession } from '@/providers/session-provider';
import { useRouter, Link } from '@/i18n/navigation';
import {
  browserRequest,
  BrowserApiError,
  isUncertainRequestError,
  errorMessage,
} from '@/lib/browser-api';
import { formatPrice } from '@/features/trips/format';
import type { SeatList, Trip } from '@/features/trips/types';
import type { Booking } from '@/features/bookings/types';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { useSearchParams } from 'next/navigation';
import { PassengerForm } from './passenger-form';
import { SeatMap } from './seat-map';
export function SeatBooking({
  trip,
  initialSeats,
}: {
  trip: Trip;
  initialSeats: SeatList;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Seats');
  const router = useRouter();
  const queryClient = useQueryClient();
  const summaryRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();
  const [store] = useState(() => {
    const store = createBookingStore();
    const ids = (searchParams.get('seats') ?? '')
      .split(',')
      .slice(0, initialSeats.seats.length);
    for (const seat of initialSeats.seats) {
      if (seat.isAvailable && ids.includes(seat.id))
        store.getState().toggle(seat.id);
    }
    return store;
  });
  const selectedIds = useStore(store, (state) => state.selectedIds);
  const { user, status, request } = useSession();
  const [phase, setPhase] = useState<'select' | 'details'>(
    store.getState().selectedIds.length ? 'details' : 'select',
  );
  useEffect(() => {
    if (phase === 'details' && window.matchMedia('(max-width: 767px)').matches)
      summaryRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [phase]);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const query = useQuery({
    queryKey: ['trip-seats', trip.id],
    initialData: initialSeats,
    queryFn: async () =>
      (await browserRequest<{ data: SeatList }>('trips/' + trip.id + '/seats'))
        .data,
    refetchInterval: 15000,
    retry: 1,
  });
  const seats = query.data.seats;
  const selected = seats.filter(
    (seat) => selectedIds.includes(seat.id) && seat.isAvailable,
  );
  const changed = selectedIds.length !== selected.length;
  const total = selected.length * trip.pricePiastres;
  function toggle(id: string) {
    store.getState().toggle(id);
    setPhase('select');
    setError('');
  }
  async function reserve(input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) {
    setError('');
    const latest = await query.refetch();
    const live = latest.data;
    if (latest.error || !live) {
      setError(t('refreshFailed'));
      return;
    }
    if (
      !input.passengers.length ||
      input.passengers.some(
        (person) =>
          !live.seats.some(
            (seat) => seat.id === person.seatId && seat.isAvailable,
          ),
      )
    ) {
      setError(t('conflict'));
      return;
    }
    try {
      const result = await request<{ data: Booking }>('bookings', {
        method: 'POST',
        body: JSON.stringify({ tripId: trip.id, ...input }),
      });
      store.getState().clear();
      await queryClient.invalidateQueries({
        queryKey: ['trip-seats', trip.id],
      });
      router.push('/bookings/' + result.data.id);
    } catch (cause) {
      if (isUncertainRequestError(cause)) {
        setUncertain(true);
        setError(t('uncertain'));
        return;
      }
      setError(errorMessage(cause, locale));
      if (cause instanceof BrowserApiError && cause.code === 'SEAT_UNAVAILABLE')
        await query.refetch();
    }
  }
  return (
    <div className="booking-grid">
      <section className="seat-section">
        <div className="section-heading">
          <div>
            <h2>{t('title')}</h2>
            <p>{t('subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => query.refetch()}
            aria-label={t('refresh')}
            disabled={query.isFetching}
          >
            <RefreshCw
              size={18}
              className={query.isFetching ? 'animate-spin' : ''}
            />
          </button>
        </div>
        {query.isError && (
          <p role="alert" className="notice">
            {t('refreshFailed')}
          </p>
        )}
        <SeatMap
          seats={seats}
          selectedIds={selected.map((seat) => seat.id)}
          layout={query.data.seatLayout}
          onToggle={toggle}
        />
      </section>
      <aside ref={summaryRef} className="selection-summary">
        <div className="summary-heading">
          <h2>{t('summary')}</h2>
          <span className="pill">
            {t('selectedCount', { count: selected.length })}
          </span>
        </div>
        <div className="summary-row">
          <span>{t('price')}</span>
          <strong>{formatPrice(trip.pricePiastres, locale)}</strong>
        </div>
        <div className="selected-list" aria-live="polite">
          {selected.length ? (
            selected.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => toggle(seat.id)}
                className="selected-chip"
              >
                {t('seatNumber', { number: seat.number })}
                <span aria-hidden="true">×</span>
                <span className="sr-only">{t('remove')}</span>
              </button>
            ))
          ) : (
            <p className="muted text-sm">{t('chooseFirst')}</p>
          )}
        </div>
        {changed && (
          <p role="status" className="notice">
            {t('changed')}
          </p>
        )}
        <div className="summary-total">
          <span>{t('total')}</span>
          <strong>{formatPrice(total, locale)}</strong>
        </div>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        {uncertain ? (
          <Link href="/bookings" className="button-primary w-full">
            {t('myBookings')}
          </Link>
        ) : phase === 'select' ? (
          <>
            <button
              type="button"
              className="button-primary w-full"
              disabled={
                !selected.length || status === 'loading' || query.isError
              }
              onClick={() => setPhase('details')}
            >
              {t('continue')}
              <ArrowRight size={18} className="rtl:rotate-180" />
            </button>
            <p className="summary-note">{t('notReserved')}</p>
          </>
        ) : (
          <RequireAuth
            returnTo={
              '/trips/' +
              trip.id +
              '?seats=' +
              encodeURIComponent(selectedIds.join(','))
            }
          >
            {user && (
              <PassengerForm
                key={user.id}
                seats={selected}
                user={user}
                disabled={!selected.length || query.isError}
                onReserve={reserve}
              />
            )}
          </RequireAuth>
        )}
      </aside>
      {phase === 'select' && (
        <div className="mobile-selection-bar">
          <div>
            <span>{t('selectedCount', { count: selected.length })}</span>
            <strong>{formatPrice(total, locale)}</strong>
          </div>
          <button
            type="button"
            className="button-primary"
            disabled={!selected.length || status === 'loading' || query.isError}
            onClick={() => setPhase('details')}
          >
            {t('continue')}
          </button>
        </div>
      )}
    </div>
  );
}
