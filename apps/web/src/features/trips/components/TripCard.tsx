import { useTranslations } from 'next-intl';
import { BusFront, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { displayName, formatPrice, formatTime } from '@/shared/lib/format';
import { cairoDate } from '@/features/trips/schemas/searchSchema';
import type { Trip } from '@/features/trips/types/trip';
export function TripCard({
  trip,
  locale,
}: {
  trip: Trip;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('Trips');
  const minutes = Math.round(
    (Date.parse(trip.arrivalAt) - Date.parse(trip.departureAt)) / 60000,
  );
  return (
    <article className="trip-card">
      <div className="trip-class">
        <BusFront size={23} />
        <strong>
          {trip.bus.busType ? displayName(trip.bus.busType, locale) : t('bus')}
        </strong>
        <span>{t('capacity', { count: trip.bus.seatCount })}</span>
      </div>
      <div className="trip-journey">
        <div className="time-stop">
          <strong>{formatTime(trip.departureAt, locale)}</strong>
          <span>{displayName(trip.route.originStation, locale)}</span>
          <small>{displayName(trip.route.originStation.city, locale)}</small>
        </div>
        <div className="journey-line">
          <span>
            {t('duration', {
              hours: Math.floor(minutes / 60),
              minutes: minutes % 60,
            })}
          </span>
          <div>
            <i />
            <span />
            <ArrowRight size={15} className="rtl:rotate-180" />
          </div>
          <small>{t('direct')}</small>
        </div>
        <div className="time-stop">
          <strong>{formatTime(trip.arrivalAt, locale)}</strong>
          <span>{displayName(trip.route.destinationStation, locale)}</span>
          <small>
            {displayName(trip.route.destinationStation.city, locale)}
            {cairoDate(trip.arrivalAt) !== cairoDate(trip.departureAt)
              ? ' · ' + t('nextDay')
              : ''}
          </small>
        </div>
        <div className="trip-amenities">
          {trip.bus.amenities.map((amenity) => (
            <span key={amenity.code}>{displayName(amenity, locale)}</span>
          ))}
        </div>
      </div>
      <div className="trip-fare">
        <strong>{formatPrice(trip.pricePiastres, locale)}</strong>
        <span>{t('perSeat')}</span>
        <Link href={'/trips/' + trip.id} className="button-primary">
          {t('seats')}
        </Link>
      </div>
    </article>
  );
}
