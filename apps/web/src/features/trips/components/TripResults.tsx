'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { displayName } from '@/shared/lib/format';
import { errorMessage } from '@/shared/lib/apiResult';
import { TripSearchForm } from './TripSearchForm';
import { TripCard } from './TripCard';
import {
  searchHref,
  cairoDate,
  addDays,
  type Search,
} from '../schemas/searchSchema';
import { useTripCatalog, useTripSearch } from '../hooks/useTrips';
import type { Trip, TripCatalog } from '../types/trip';
export function TripResults({
  search,
  initialCatalog,
  initialTrips,
}: {
  search: Search;
  initialCatalog: TripCatalog;
  initialTrips: Trip[];
}) {
  const locale = useLocale() as 'ar' | 'en';
  const t = useTranslations('Trips');
  const catalogQuery = useTripCatalog(initialCatalog);
  const query = useTripSearch(search, initialTrips);
  const catalog = catalogQuery.data ?? initialCatalog;
  const all = query.data.items;
  const trips = all.slice(0, 20);
  const today = cairoDate();
  const origin = search.originStationId
    ? catalog.stations.find((item) => item.id === search.originStationId)
    : catalog.cities.find((item) => item.id === search.originCityId);
  const destination = search.destinationStationId
    ? catalog.stations.find((item) => item.id === search.destinationStationId)
    : catalog.cities.find((item) => item.id === search.destinationCityId);
  const days = Array.from({ length: 5 }, (_, i) =>
    addDays(search.travelDate, i - 2),
  ).filter((date) => date >= today);
  return (
    <div className="container-shell results-page">
      <section className="search-panel">
        <TripSearchForm
          key={JSON.stringify(search)}
          {...catalog}
          today={today}
          defaults={search}
        />
      </section>
      {query.isError && (
        <p className="notice" role="alert">
          {errorMessage(query.error, locale)}{' '}
          <button
            type="button"
            className="text-button"
            onClick={() => void query.refetch()}
          >
            {t('error')}
          </button>
        </p>
      )}
      <div className="results-heading">
        <div>
          <h1>
            {origin ? displayName(origin, locale) : t('title')}
            <span> — </span>
            {destination ? displayName(destination, locale) : ''}
          </h1>
          <p>{t('dateNote')}</p>
        </div>
        <span>{t('count', { count: trips.length })}</span>
      </div>
      <nav className="day-strip" aria-label={t('days')}>
        {days.map((date) => (
          <Link
            key={date}
            href={searchHref(search, { travelDate: date, offset: 0 })}
            className={
              date === search.travelDate ? 'day-link active' : 'day-link'
            }
            aria-current={date === search.travelDate ? 'date' : undefined}
          >
            <span>
              {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                weekday: 'short',
                timeZone: 'Africa/Cairo',
              }).format(new Date(date + 'T12:00:00Z'))}
            </span>
            <strong>
              {new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
                day: 'numeric',
                month: 'short',
                timeZone: 'Africa/Cairo',
              }).format(new Date(date + 'T12:00:00Z'))}
            </strong>
          </Link>
        ))}
      </nav>
      {trips.length === 0 ? (
        <div className="empty-state">
          <h2>{t('empty')}</h2>
          <p>{t('emptyHint')}</p>
          <Link
            href={searchHref(search, {
              travelDate: addDays(search.travelDate, 1),
              offset: 0,
            })}
            className="button-primary"
          >
            {t('nextDate')}
          </Link>
        </div>
      ) : (
        <div className="trip-list">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} locale={locale} />
          ))}
        </div>
      )}
      <nav className="pagination" aria-label={t('pagination')}>
        {search.offset > 0 && (
          <Link
            href={searchHref(search, {
              offset: Math.max(0, search.offset - 20),
            })}
            className="button-secondary"
          >
            {t('previous')}
          </Link>
        )}
        {all.length > 20 && search.offset + 20 <= 100000 && (
          <Link
            href={searchHref(search, { offset: search.offset + 20 })}
            className="button-secondary"
          >
            {t('next')}
          </Link>
        )}
      </nav>
    </div>
  );
}
