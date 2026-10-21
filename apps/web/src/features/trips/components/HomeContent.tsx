'use client';
import { useTranslations } from 'next-intl';
import { BusFront, MapPin, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { QueryError } from '@/shared/components/feedback/QueryError';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { TripSearchForm } from './TripSearchForm';
import { useTripCatalog } from '../hooks/useTrips';
import type { TripCatalog } from '../types/trip';

const popularRoutes = [
  ['Cairo', 'Alexandria'],
  ['Giza', 'Alexandria'],
  ['Cairo', 'Hurghada'],
  ['Cairo', 'Sharm El Sheikh'],
] as const;

export function HomeContent({
  initial,
  today,
}: {
  initial?: TripCatalog;
  today: string;
}) {
  const t = useTranslations('Home');
  const forms = useTranslations('Forms');
  const query = useTripCatalog(initial);
  const catalog = query.data;
  const routes = popularRoutes.flatMap(([origin, destination]) => {
    const from = catalog?.cities.find((city) => city.nameEn === origin);
    const to = catalog?.cities.find((city) => city.nameEn === destination);
    return from && to ? [{ from, to, origin, destination }] : [];
  });
  return (
    <>
      <div className="relative z-10 mx-auto mt-0 w-[calc(100%-2rem)] max-w-[1240px] md:mt-0">
        <section
          className="premium-search-sheet rounded-[1.75rem] border border-border/70 bg-card p-5 md:p-7"
          aria-labelledby="trip-search-title"
        >
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <BusFront size={21} aria-hidden="true" className="text-primary" />
            <h2
              id="trip-search-title"
              className="text-base font-semibold md:text-lg"
            >
              {t('findTrip')}
            </h2>
            <span className="ms-1 border-s ps-3 text-xs text-muted-foreground">
              {t('oneWay')}
            </span>
          </div>
          {query.isError && (
            <QueryError
              message={t('apiUnavailable')}
              onRetry={() => void query.refetch()}
              pending={query.isFetching}
            />
          )}
          {catalog && catalog.cities.length > 1 ? (
            <TripSearchForm {...catalog} today={today} />
          ) : query.isPending ? (
            <div
              role="status"
              aria-label={forms('loading')}
              className="grid gap-4 md:grid-cols-3"
            >
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : catalog ? (
            <p className="text-sm text-muted-foreground">{t('noCities')}</p>
          ) : null}
        </section>
      </div>
      {routes.length > 0 && (
        <section
          className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] pt-12 pb-4 md:pt-20 md:pb-6"
          aria-labelledby="popular-routes-title"
        >
          <h2
            id="popular-routes-title"
            className="text-2xl font-semibold md:text-[34px]"
          >
            {t('destinations')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('destinationsText')}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {routes.map(({ from, to, origin, destination }) => (
              <Link
                key={from.id + to.id}
                href={
                  '/trips?' +
                  new URLSearchParams({
                    originCityId: from.id,
                    destinationCityId: to.id,
                    travelDate: today,
                  })
                }
                className="home-route-link group flex flex-col rounded-[1.5rem] border border-border/70 bg-card p-4 hover:border-primary/40 sm:p-6"
              >
                <div className="hidden items-center justify-between gap-3 text-xs text-muted-foreground sm:flex">
                  <span>{t('routeSearch')}</span>
                  <BusFront
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-1 min-h-20 sm:mt-6 sm:min-h-24">
                  <p className="text-xs text-muted-foreground">
                    {t('routeFrom', { city: t('cityNames.' + origin) })}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold leading-relaxed sm:text-2xl group-hover:text-primary">
                    {t('cityNames.' + destination)}
                  </h3>
                </div>
                <div
                  aria-hidden="true"
                  className="my-4 flex items-center gap-2 text-primary/40"
                >
                  <span className="size-2 rounded-full border-2 border-current" />
                  <span className="home-route-line flex-1 border-t border-dashed border-current" />
                  <MapPin size={13} />
                </div>
                <div className="flex min-h-8 items-center justify-between gap-3 border-t pt-3 text-xs text-primary">
                  <span>{t('viewTrips')}</span>
                  <span className="home-route-arrow">
                    <ArrowLeft
                      size={17}
                      className="ltr:rotate-180"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
