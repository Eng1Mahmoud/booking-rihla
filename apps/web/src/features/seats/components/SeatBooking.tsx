'use client';
import { Button } from '@/shared/components/ui/button';
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
    <div className="grid items-start gap-5 pb-[85px] md:grid-cols-[minmax(0,1fr)_330px] md:pb-0 min-[1001px]:grid-cols-[minmax(0,1fr)_360px] min-[1001px]:gap-7">
      <section className="rounded-[14px] border bg-card px-3.5 py-[22px] md:p-[22px] min-[1001px]:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-5">
          <div>
            <h2 className="text-[21px] font-semibold md:text-[23px]">
              {t('title')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground md:text-[13px]">
              {t('subtitle')}
            </p>
          </div>
          <Button
            variant="outline"
            type="button"
            className="size-10 shrink-0 bg-card text-muted-foreground"
            onClick={refreshSeats}
            aria-label={t('refresh')}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
        {seatQuery.isError && (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          >
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
      <aside
        ref={summaryRef}
        className="scroll-mt-[110px] rounded-[14px] border bg-card p-[22px] md:sticky md:top-28 md:p-6"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{t('summary')}</h2>
          <span className="inline-flex rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-primary">
            {t('selectedCount', { count: selected.length })}
          </span>
        </div>
        <div className="flex justify-between gap-2.5 py-2.5 text-xs">
          <span className="text-muted-foreground">{t('price')}</span>
          <strong className="font-medium">
            {formatPrice(trip.pricePiastres, locale)}
          </strong>
        </div>
        <div
          className="flex min-h-[58px] flex-wrap gap-2 py-4"
          aria-live="polite"
        >
          {selected.length ? (
            selected.map((seat) => (
              <button
                key={seat.id}
                type="button"
                onClick={() => toggle(seat.id)}
                className="inline-flex cursor-pointer min-h-11 items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-800 hover:bg-sky-100"
              >
                {t('seatNumber', { number: seat.number })}
                <span
                  className="first-of-type:text-lg first-of-type:leading-none"
                  aria-hidden="true"
                >
                  ×
                </span>
                <span className="sr-only first-of-type:text-lg first-of-type:leading-none">
                  {t('remove')}
                </span>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">{t('chooseFirst')}</p>
          )}
        </div>
        {changed && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          >
            {t('changed')}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-5 border-t py-[18px] text-sm">
          <span>{t('total')}</span>
          <strong className="text-[22px] font-semibold whitespace-nowrap">
            {formatPrice(total, locale)}
          </strong>
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          >
            {error}
          </p>
        )}
        {uncertain ? (
          <Button size="lg" className="w-full" asChild>
            <Link href="/bookings">{t('myBookings')}</Link>
          </Button>
        ) : phase === 'select' ? (
          <>
            <Button
              size="lg"
              type="button"
              className="w-full"
              disabled={!selected.length || status === 'loading'}
              onClick={() => setPhase('details')}
            >
              {t('continue')}
              <ArrowRight size={18} className="rtl:rotate-180" />
            </Button>
            <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
              {t('notReserved')}
            </p>
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
        <div className="fixed inset-x-0 bottom-0 z-25 flex items-center justify-between gap-4 border-t bg-card px-[18px] pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_#092b4710] md:hidden">
          <div className="grid gap-0.5">
            <span className="text-xs text-muted-foreground">
              {t('selectedCount', { count: selected.length })}
            </span>
            <strong className="text-xl font-semibold whitespace-nowrap">
              {formatPrice(total, locale)}
            </strong>
          </div>
          <Button
            size="lg"
            type="button"

            disabled={!selected.length || status === 'loading'}
            onClick={() => setPhase('details')}
          >
            {t('continue')}
          </Button>
        </div>
      )}
    </div>
  );
}
