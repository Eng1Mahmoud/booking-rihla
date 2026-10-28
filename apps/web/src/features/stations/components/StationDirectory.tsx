'use client';

import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { QueryError } from '@/shared/components/feedback/QueryError';
import type { TripCatalog } from '@/features/trips/types/trip';
import { StationGroup } from './StationGroup';
import { useStationDirectory } from '../hooks/useStationDirectory';

export function StationDirectory({
  initial,
  initialCityId = '',
}: {
  initial?: TripCatalog;
  initialCityId?: string;
}) {
  const t = useTranslations('Stations');
  const locale = useLocale() as 'ar' | 'en';
  const {
    query,
    catalog,
    search,
    setSearch,
    cityId,
    setCityId,
    cities,
    groups,
    count,
    clear,
  } = useStationDirectory({ initial, initialCityId, locale });
  const name = (item: { nameAr: string; nameEn: string }) =>
    locale === 'ar' ? item.nameAr : item.nameEn;

  return (
    <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] py-8 md:py-12">
      <section
        aria-label={t('filters')}
        className="grid gap-4 shadow-[0_20px_60px_-36px_#112f4555,0_3px_12px_-8px_#112f4525] rounded-[1.5rem] border border-border/70 bg-card p-5 md:grid-cols-[1fr_280px] md:p-7"
      >
        <div>
          <label
            htmlFor="station-search"
            className="mb-2 block text-sm font-medium"
          >
            {t('searchLabel')}
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="station-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-12 bg-background ps-10"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="station-city"
            className="mb-2 block text-sm font-medium"
          >
            {t('cityLabel')}
          </label>
          <NativeSelect
            id="station-city"
            value={cityId}
            onChange={(event) => setCityId(event.target.value)}
            className="h-12 bg-card text-base"
          >
            <NativeSelectOption value="">{t('allCities')}</NativeSelectOption>
            {cities.map((city) => (
              <NativeSelectOption key={city.id} value={city.id}>
                {name(city)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </section>
      {query.isError && (
        <QueryError
          message={t('error')}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
        />
      )}
      {query.isPending && (
        <div
          className="mt-8 grid gap-4"
          role="status"
          aria-label={t('loading')}
        >
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}
      {catalog && (
        <>
          <div className="my-7 flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-muted-foreground"
            >
              {t('results', { count })}
            </p>
            {(search || cityId) && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={clear}
              >
                {t('clear')}
              </Button>
            )}
          </div>
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center">
              <MapPin
                size={30}
                aria-hidden="true"
                className="mx-auto mb-4 text-primary"
              />
              <h2 className="text-xl font-semibold">
                {t(catalog.stations.length ? 'noResults' : 'empty')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(catalog.stations.length ? 'noResultsText' : 'emptyText')}
              </p>
              {(search || cityId) && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-5 min-h-11"
                  onClick={clear}
                >
                  {t('clear')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-9">
              {groups.map((group) => (
                <StationGroup key={group.id} {...group} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
