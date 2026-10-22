'use client';
import { useTranslations, useLocale } from 'next-intl';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { QueryError } from '@/shared/components/feedback/QueryError';
import { errorMessage } from '@/shared/lib/apiResult';
import { formatPrice } from '@/shared/lib/format';
import { Link } from '@/i18n/navigation';
import type { SeatList, Trip } from '@/features/trips/types/trip';
import { PassengerForm } from './PassengerForm';
import { SeatMap } from './SeatMap';
import { useSeatBooking } from '../hooks/useSeatBooking';

export function SeatBooking({
  trip,
  initialSeats,
}: {
  trip: Trip;
  initialSeats: SeatList;
}) {
  const t = useTranslations('Seats');
  const auth = useTranslations('Auth');
  const locale = useLocale() as 'ar' | 'en';
  const {
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
    selected,
    toggle,
    reserve,
    refreshSeats,
  } = useSeatBooking(trip, initialSeats);
  const total = selected.length * trip.pricePiastres;
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
            disabled={seatQuery.isFetching}
          >
            <RefreshCw
              size={18}
              className={seatQuery.isFetching ? 'animate-spin' : ''}
            />
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
          seats={seatQuery.data.seats}
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
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs text-sky-800 hover:bg-sky-100"
              >
                {t('seatNumber', { number: seat.number })}
                <span aria-hidden="true" className="text-lg leading-none">
                  ×
                </span>
                <span className="sr-only">{t('remove')}</span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('chooseFirst')}</p>
          )}
        </div>
        {availabilityNotice && (
          <p
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950"
          >
            {availabilityNotice}
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
        ) : status === 'unavailable' ? (
          <QueryError
            message={auth('sessionUnavailable')}
            onRetry={() => void reloadSession()}
          />
        ) : user ? (
          <PassengerForm
            key={user.id}
            seats={selected}
            user={user}
            disabled={!selected.length}
            onReserve={reserve}
          />
        ) : (
          <p className="py-15 text-center text-muted-foreground" role="status">
            {auth('checkingSession')}
          </p>
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
