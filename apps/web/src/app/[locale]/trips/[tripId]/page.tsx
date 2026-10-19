import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BusFront, ArrowLeft, MapPin } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ApiResponseError } from '@/shared/lib/server/backend';
import { getSeats, getTrip } from '@/features/trips/api/trips.server';
import { displayName, formatDate, formatTime } from '@/shared/lib/format';
import { cairoDate } from '@/features/trips/schemas/searchSchema';
import { SeatBooking } from '@/features/seats/components/SeatBooking';
export default async function TripPage({
  params,
}: {
  params: Promise<{ locale: 'ar' | 'en'; tripId: string }>;
}) {
  const { locale, tripId } = await params;
  const t = await getTranslations('Detail');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tripId,
    )
  )
    notFound();
  let data;
  try {
    data = await Promise.all([getTrip(tripId), getSeats(tripId)]);
  } catch (error) {
    if (error instanceof ApiResponseError && error.status === 404) notFound();
    return (
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('error')}</h1>
          <Link href="/" className="button-primary">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  }
  const [trip, seats] = data;
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
      <SeatBooking key={trip.id} trip={trip} initialSeats={seats} />
    </div>
  );
}
