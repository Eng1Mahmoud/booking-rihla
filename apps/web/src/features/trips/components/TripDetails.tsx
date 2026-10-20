'use client';
import { useLocale, useTranslations } from 'next-intl';
import { BusFront, ArrowLeft, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { displayName, formatDate, formatTime } from '@/shared/lib/format';
import { errorMessage } from '@/shared/lib/apiResult';
import { SeatBooking } from '@/features/seats/components/SeatBooking';
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
    <div className="container-shell page-space">
      <Link href={back} className="back-link">
        <ArrowLeft size={17} className="rtl:rotate-180" />
        {t('back')}
      </Link>
      <section className="trip-heading">
        <div>
          <h1>
            {displayName(trip.route.originStation.city, locale)}
            <span> — </span>
            {displayName(trip.route.destinationStation.city, locale)}
          </h1>
          <p>{formatDate(trip.departureAt, locale)}</p>
        </div>
        <span className="trip-bus-type">
          <BusFront size={20} />
          {trip.bus.busType ? displayName(trip.bus.busType, locale) : t('bus')}
        </span>
      </section>
      <div className="trip-station-bar">
        <span>
          <MapPin size={18} />
          {displayName(trip.route.originStation, locale)}
          <bdi>{formatTime(trip.departureAt, locale)}</bdi>
        </span>
        <span className="station-bar-line" />
        <span>
          <MapPin size={18} />
          {displayName(trip.route.destinationStation, locale)}
          <bdi>{formatTime(trip.arrivalAt, locale)}</bdi>
        </span>
      </div>
      {query.isError && (
        <p className="notice" role="alert">
          {errorMessage(query.error, locale)}
        </p>
      )}
      <SeatBooking key={trip.id} trip={trip} initialSeats={seats} />
    </div>
  );
}
