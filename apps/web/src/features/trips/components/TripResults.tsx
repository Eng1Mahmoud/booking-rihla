'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { QueryError } from '@/shared/components/feedback/QueryError';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { displayName } from '@/shared/lib/format';
import { errorMessage } from '@/shared/lib/apiResult';
import { cn } from '@/shared/lib/cn';
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
  const dayFormat = new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { weekday: 'short', timeZone: 'Africa/Cairo' },
  );
  const dateFormat = new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-EG' : 'en-GB',
    { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' },
  );
  return (
    <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] py-6 md:pt-8 md:pb-16">
      <section
        className="premium-search-sheet rounded-[1.75rem] border border-border/70 bg-card p-5 md:p-7"
        aria-label={t('title')}
      >
        <TripSearchForm
          key={JSON.stringify(search)}
          {...catalog}
          today={today}
          defaults={search}
        />
      </section>
      {query.isError && (
        <QueryError
          message={errorMessage(query.error, locale)}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
        />
      )}
      {catalogQuery.isError && (
        <QueryError
          message={errorMessage(catalogQuery.error, locale)}
          onRetry={() => void catalogQuery.refetch()}
          pending={catalogQuery.isFetching}
        />
      )}
      <div className="mt-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-5">
        <div>
          <h1 className="text-2xl font-semibold md:text-3xl">
            {origin ? displayName(origin, locale) : t('title')}
            <span className="text-muted-foreground"> — </span>
            {destination ? displayName(destination, locale) : ''}
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">{t('dateNote')}</p>
        </div>
        <span className="text-sm text-muted-foreground">
          {t('count', { count: trips.length })}
        </span>
      </div>
      <nav
        className="my-6 flex gap-2 overflow-x-auto pb-2"
        aria-label={t('days')}
      >
        {days.map((date) => {
          const selected = date === search.travelDate;
          const value = new Date(date + 'T12:00:00Z');
          return (
            <Link
              key={date}
              href={searchHref(search, { travelDate: date, offset: 0 })}
              className={cn(
                'grid min-w-24 flex-1 gap-1 rounded-lg border bg-card px-4 py-3 text-center hover:bg-accent md:min-w-28',
                selected && 'border-primary bg-accent ring-1 ring-primary',
              )}
              aria-current={selected ? 'date' : undefined}
            >
              <span
                className={cn(
                  'text-xs text-muted-foreground',
                  selected && 'text-primary',
                )}
              >
                {dayFormat.format(value)}
              </span>
              <time dateTime={date} className="text-sm font-medium">
                {dateFormat.format(value)}
              </time>
            </Link>
          );
        })}
      </nav>
      {trips.length === 0 ? (
        // A failed refresh must not claim that the search has no departures.
        !query.isError && (
          <EmptyState title={t('empty')} description={t('emptyHint')}>
            <Button asChild className="h-12">
              <Link
                href={searchHref(search, {
                  travelDate: addDays(search.travelDate, 1),
                  offset: 0,
                })}
              >
                {t('nextDate')}
              </Link>
            </Button>
          </EmptyState>
        )
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} locale={locale} />
          ))}
        </div>
      )}
      {(search.offset > 0 ||
        (all.length > 20 && search.offset + 20 <= 100000)) && (
        <nav
          className="mt-7 flex flex-wrap justify-center gap-3"
          aria-label={t('pagination')}
        >
          {search.offset > 0 && (
            <Button asChild variant="outline" className="h-12 bg-card">
              <Link
                href={searchHref(search, {
                  offset: Math.max(0, search.offset - 20),
                })}
              >
                {t('previous')}
              </Link>
            </Button>
          )}
          {all.length > 20 && search.offset + 20 <= 100000 && (
            <Button asChild variant="outline" className="h-12 bg-card">
              <Link href={searchHref(search, { offset: search.offset + 20 })}>
                {t('next')}
              </Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
