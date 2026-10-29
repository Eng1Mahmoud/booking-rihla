'use client';
import { useLocale, useTranslations } from 'next-intl';
import { BusFront, ArrowLeft, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import { QueryError } from '@/shared/components/feedback';
import {
  displayName,
  formatDate,
  formatTime,
  errorMessage,
} from '@/shared/lib';
import { SeatBooking } from '@/features/seats';
import { cairoDate } from '../schemas/searchSchema';
import { useTripDetails } from '../hooks/useTrips';
import type { Trip, SeatList } from '../types/trip';

export function TripDetails({
  initial,
  seats,
}: {
  initial: Trip;
  seats: SeatList;
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Detail');
  const query = useTripDetails(initial);
  const trip = query.data;
  const back =
    '/trips?' +
    new URLSearchParams({
      originStationId: trip.route.originStation.id,
      destinationStationId: trip.route.destinationStation.id,
      travelDate: cairoDate(trip.departureAt),
    });
  return (
    <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-6 md:pt-9 md:pb-16">
      <Button
        asChild
        variant="ghost"
        className="-ms-3 min-h-11 text-muted-foreground"
      >
        <Link href={back}>
          <ArrowLeft size={17} aria-hidden="true" className="rtl:rotate-180" />
          {t('back')}
        </Link>
      </Button>
      <section className="flex flex-wrap items-start justify-between gap-4 py-5 md:items-center">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {displayName(trip.route.originStation.city, locale)}
            <span className="text-muted-foreground"> — </span>
            {displayName(trip.route.destinationStation.city, locale)}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <time dateTime={trip.departureAt}>
              {formatDate(trip.departureAt, locale)}
            </time>
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
          <BusFront size={20} aria-hidden="true" className="text-primary" />
          {trip.bus.busType ? displayName(trip.bus.busType, locale) : t('bus')}
        </span>
      </section>
      <div className="mb-6 grid gap-4 border-y py-4 md:flex md:items-center md:gap-6">
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <MapPin
            size={18}
            aria-hidden="true"
            className="shrink-0 text-primary"
          />
          {displayName(trip.route.originStation, locale)}
          <time dateTime={trip.departureAt} className="font-semibold">
            <bdi>{formatTime(trip.departureAt, locale)}</bdi>
          </time>
        </span>
        <span
          className="hidden h-px w-14 shrink-0 bg-border md:block"
          aria-hidden="true"
        />
        <span className="flex flex-wrap items-center gap-2 text-sm">
          <MapPin
            size={18}
            aria-hidden="true"
            className="shrink-0 text-primary"
          />
          {displayName(trip.route.destinationStation, locale)}
          <time dateTime={trip.arrivalAt} className="font-semibold">
            <bdi>{formatTime(trip.arrivalAt, locale)}</bdi>
          </time>
        </span>
      </div>
      {query.isError && (
        <QueryError
          message={errorMessage(query.error, locale)}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
        />
      )}
      <SeatBooking key={trip.id} trip={trip} initialSeats={seats} />
    </div>
  );
}
