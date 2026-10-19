import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { searchTrips } from '@/features/trips/api';
import { getSearchCatalog } from '@/features/trips/api';
import { TripSearchForm } from '@/features/trips/components/trip-search-form';
import { TripCard } from '@/features/trips/components/trip-card';
import {
  searchSchema,
  searchHref,
  cairoDate,
  addDays,
} from '@/features/trips/search';
import { displayName } from '@/features/trips/format';
export default async function TripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, raw] = await Promise.all([params, searchParams]);
  const t = await getTranslations('Trips');
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('invalid')}</h1>
          <Link href="/" className="button-primary">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  const search = parsed.data;
  let data;
  try {
    data = await Promise.all([getSearchCatalog(), searchTrips(search)]);
  } catch {
    return (
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('error')}</h1>
          <Link href={searchHref(search)} className="button-primary">
            {t('retry')}
          </Link>
          <Link href="/" className="text-button">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  }
  const [catalog, all] = data;
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
