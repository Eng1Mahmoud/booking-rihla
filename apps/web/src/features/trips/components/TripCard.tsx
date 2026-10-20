import { useTranslations } from 'next-intl';
import { BusFront, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { displayName, formatPrice, formatTime } from '@/shared/lib/format';
import { cairoDate } from '../schemas/searchSchema';
import type { Trip } from '../types/trip';

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
    <article className="grid min-w-0 overflow-hidden rounded-xl border bg-card md:grid-cols-[110px_minmax(0,1fr)_170px] xl:grid-cols-[140px_minmax(0,1fr)_190px]">
      <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-3 md:flex-col md:justify-center md:border-e md:border-b-0 md:p-5">
        <BusFront
          size={23}
          aria-hidden="true"
          className="shrink-0 text-primary"
        />
        <strong className="text-sm font-semibold">
          {trip.bus.busType ? displayName(trip.bus.busType, locale) : t('bus')}
        </strong>
        <span className="ms-auto text-xs text-muted-foreground md:ms-0">
          {t('capacity', { count: trip.bus.seatCount })}
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-5 gap-y-4 p-5 md:grid-cols-[minmax(0,1fr)_85px_minmax(0,1fr)] md:gap-x-3 xl:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)] xl:px-7">
        <JourneyStop
          at={trip.departureAt}
          station={trip.route.originStation}
          locale={locale}
        />
        <div className="hidden pt-2 text-center text-xs text-muted-foreground md:block">
          <span>
            {t('duration', {
              hours: Math.floor(minutes / 60),
              minutes: minutes % 60,
            })}
          </span>
          <div className="my-2 flex items-center" aria-hidden="true">
            <span className="size-1.5 rounded-full border border-current" />
            <span className="h-px flex-1 bg-border" />
            <ArrowRight size={15} className="rtl:rotate-180" />
          </div>
          <span>{t('direct')}</span>
        </div>
        <JourneyStop
          at={trip.arrivalAt}
          station={trip.route.destinationStation}
          locale={locale}
          note={
            cairoDate(trip.arrivalAt) !== cairoDate(trip.departureAt)
              ? t('nextDay')
              : undefined
          }
        />
        <p className="col-span-full text-xs text-muted-foreground md:hidden">
          {t('duration', {
            hours: Math.floor(minutes / 60),
            minutes: minutes % 60,
          })}{' '}
          · {t('direct')}
        </p>
        {trip.bus.amenities.length > 0 && (
          <ul className="col-span-full flex flex-wrap gap-2 border-t pt-3">
            {trip.bus.amenities.map((amenity) => (
              <li
                key={amenity.code}
                className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {displayName(amenity, locale)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed px-5 py-4 md:flex-col md:justify-center md:gap-1 md:border-s md:border-t-0">
        <div className="md:text-center">
          <strong className="block whitespace-nowrap text-xl font-semibold xl:text-2xl">
            {formatPrice(trip.pricePiastres, locale)}
          </strong>
          <span className="text-xs text-muted-foreground">{t('perSeat')}</span>
        </div>
        <Button asChild className="h-12 md:mt-3 md:w-full">
          <Link href={'/trips/' + trip.id}>{t('seats')}</Link>
        </Button>
      </div>
    </article>
  );
}

// Departure and arrival share the same station/time presentation.
function JourneyStop({
  at,
  station,
  locale,
  note,
}: {
  at: string;
  station: Trip['route']['originStation'];
  locale: 'ar' | 'en';
  note?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <time dateTime={at} className="text-xl font-semibold xl:text-2xl">
        <bdi>{formatTime(at, locale)}</bdi>
      </time>
      <span className="text-sm font-medium wrap-anywhere">
        {displayName(station, locale)}
      </span>
      <span className="text-xs text-muted-foreground">
        {displayName(station.city, locale)}
        {note ? ' · ' + note : ''}
      </span>
    </div>
  );
}
