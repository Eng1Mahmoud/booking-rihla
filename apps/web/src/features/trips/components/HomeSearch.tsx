'use client';
import { useTranslations } from 'next-intl';
import { BusFront } from 'lucide-react';
import { QueryError, JourneyLoading } from '@/shared/components/feedback';
import { TripSearchForm } from './TripSearchForm';
import { useTripCatalog } from '../hooks/useTrips';
import type { TripCatalog } from '../types/trip';

export function HomeSearch({
  initial,
  today,
}: {
  initial?: TripCatalog;
  today: string;
}) {
  const t = useTranslations('Home');
  const query = useTripCatalog(initial);
  const catalog = query.data;
  return (
    <section
      className="rounded-2xl border border-border bg-card p-4 md:p-7"
      aria-labelledby="trip-search-title"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2.5 md:mb-5">
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
        <JourneyLoading
          variant="inline"
          title={t('loadingSearch')}
          description={t('loadingSearchHint')}
        />
      ) : catalog ? (
        <p className="text-sm text-muted-foreground">{t('noCities')}</p>
      ) : null}
    </section>
  );
}
