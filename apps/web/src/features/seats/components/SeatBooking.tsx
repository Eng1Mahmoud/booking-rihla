'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from 'zustand';
import { useCreateBooking } from '@/features/bookings/hooks/useBookings';
import { useLocale, useTranslations } from 'next-intl';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { createBookingStore } from '@/features/seats/store/bookingStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useRouter, Link } from '@/i18n/navigation';
import {
  ApiError,
  isUncertainRequestError,
  errorMessage,
} from '@/shared/lib/apiResult';
import { formatPrice } from '@/shared/lib/format';
import type { SeatList, Trip } from '@/features/trips/types/trip';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { useSearchParams } from 'next/navigation';
import { PassengerForm } from '@/features/seats/components/PassengerForm';
import { SeatMap } from '@/features/seats/components/SeatMap';
import { useTripSeats } from '../hooks/useTripSeats';
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
  const createBooking = useCreateBooking();
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
  const { user, status } = useAuth();
  const [phase, setPhase] = useState<'select' | 'details'>(
    store.getState().selectedIds.length ? 'details' : 'select',
  );
  useEffect(() => {
    if (phase === 'details' && window.matchMedia('(max-width: 767px)').matches)
      summaryRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [phase]);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const seatQuery = useTripSeats(initialSeats);
  const refreshing = seatQuery.isFetching;
  const refreshSeats = () => {
    void seatQuery.refetch();
  };
  const seats = seatQuery.data.seats;
  const selected = seats.filter(
    (seat) => selectedIds.includes(seat.id) && seat.isAvailable,
  );
  const changed = selectedIds.length !== selected.length;
  const total = selected.length * trip.pricePiastres;
  function toggle(id: string) {
    store.getState().toggle(id);
    // Keep the details form mounted when selection changes, preserving the remaining names.
    setError('');
  }
  async function reserve(input: {
    contactPhone: string;
    passengers: { seatId: string; name: string }[];
  }) {
    setError('');
    // The backend checks current seat availability atomically when it creates the reservation.
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
      store.getState().clear();
      router.push('/bookings/' + result.data.id);
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
            onClick={refreshSeats}
            aria-label={t('refresh')}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
        {seatQuery.isError && (
          <p role="alert" className="notice">
            {errorMessage(seatQuery.error, locale)}
          </p>
        )}
        <SeatMap
          seats={seats}
          selectedIds={selected.map((seat) => seat.id)}
          layout={seatQuery.data.seatLayout}
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
              disabled={!selected.length || status === 'loading'}
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
                disabled={!selected.length}
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
            disabled={!selected.length || status === 'loading'}
            onClick={() => setPhase('details')}
          >
            {t('continue')}
          </button>
        </div>
      )}
    </div>
  );
}
