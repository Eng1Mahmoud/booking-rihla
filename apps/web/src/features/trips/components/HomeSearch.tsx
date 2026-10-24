'use client';
import { useTranslations } from 'next-intl';
import { BusFront } from 'lucide-react';
import { QueryError } from '@/shared/components/feedback/QueryError';
import { Skeleton } from '@/shared/components/ui/skeleton';
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
  const forms = useTranslations('Forms');
  const query = useTripCatalog(initial);
  const catalog = query.data;
  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 md:p-7"
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
  );
}
