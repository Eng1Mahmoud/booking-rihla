'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MapPin, Search, ArrowUpRight, Info, BusFront } from 'lucide-react';
import { PageIntro } from '@/shared/components/layout/PageIntro';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { QueryError } from '@/shared/components/feedback/QueryError';
import { useTripCatalog } from '@/features/trips/hooks/useTrips';
import type { TripCatalog, Station } from '@/features/trips/types/trip';
import { displayName } from '@/shared/lib/format';
import { searchText } from '@/shared/lib/searchText';

export function StationDirectory({ initial }: { initial?: TripCatalog }) {
  const t = useTranslations('Stations');
  const locale = useLocale() as 'ar' | 'en';
  const query = useTripCatalog(initial);
  const [search, setSearch] = useState('');
  const [cityId, setCityId] = useState('');
  const catalog = query.data;
  const term = searchText(search);
  const cityMap = new Map(catalog?.cities.map((city) => [city.id, city]));
  const grouped = new Map<string, Station[]>();
  for (const station of catalog?.stations ?? []) {
    const city = cityMap.get(station.cityId);
    if (cityId && cityId !== station.cityId) continue;
    if (
      term &&
      !searchText(
        [station.nameAr, station.nameEn, city?.nameAr, city?.nameEn].join(' '),
      ).includes(term)
    )
      continue;
    const group = grouped.get(station.cityId) ?? [];
    group.push(station);
    grouped.set(station.cityId, group);
  }
  const collator = new Intl.Collator(locale);
  const name = (item: { nameAr: string; nameEn: string }) =>
    displayName(item, locale);
  const stationCityIds = new Set(
    catalog?.stations.map((station) => station.cityId),
  );
  const cities = (catalog?.cities ?? [])
    .filter((city) => stationCityIds.has(city.id))
    .sort((a, b) => collator.compare(name(a), name(b)));
  const groups = [...grouped.entries()].sort(([a], [b]) =>
    collator.compare(
      cityMap.has(a) ? name(cityMap.get(a)!) : '',
      cityMap.has(b) ? name(cityMap.get(b)!) : '',
    ),
  );
  const count = groups.reduce(
    (total, [, stations]) => total + stations.length,
    0,
  );
  const clear = () => {
    setSearch('');
    setCityId('');
  };

  return (
    <>
      <PageIntro
        title={t('title')}
        description={t('intro')}
        eyebrow={t('eyebrow')}
      />
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] py-8 md:py-12">
        <section
          aria-label={t('filters')}
          className="grid gap-4 premium-search-sheet rounded-[1.5rem] border border-border/70 bg-card p-5 md:grid-cols-[1fr_280px] md:p-7"
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
              className="h-12 bg-background"
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
                {groups.map(([id, stations]) => {
                  const city = cityMap.get(id);
                  const cityName = city ? name(city) : t('otherCity');
                  return (
                    <section
                      key={id}
                      aria-labelledby={'city-' + id}
                      className="grid gap-4 md:grid-cols-[220px_1fr] md:gap-8"
                    >
                      <div className="pt-2">
                        <h2
                          id={'city-' + id}
                          className="text-xl font-semibold md:text-2xl"
                        >
                          {cityName}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {t('cityCount', { count: stations.length })}
                        </p>
                      </div>
                      <ul className="divide-y overflow-hidden rounded-[1.5rem] border border-border/70 bg-card">
                        {[...stations]
                          .sort((a, b) => collator.compare(name(a), name(b)))
                          .map((station) => (
                            <li
                              key={station.id}
                              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:flex-nowrap md:px-6"
                            >
                              <span
                                aria-hidden="true"
                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                              >
                                <MapPin size={20} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-medium wrap-anywhere">
                                  {name(station)}
                                </h3>
                                <p
                                  className="mt-1 text-xs text-muted-foreground"
                                  lang={locale === 'ar' ? 'en' : 'ar'}
                                >
                                  <bdi>
                                    {locale === 'ar'
                                      ? station.nameEn
                                      : station.nameAr}
                                  </bdi>
                                </p>
                              </div>
                              <a
                                href={
                                  'https://www.google.com/maps/search/?api=1&query=' +
                                  encodeURIComponent(
                                    [
                                      name(station),
                                      cityName,
                                      locale === 'ar' ? 'مصر' : 'Egypt',
                                    ].join(', '),
                                  )
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={t('mapFor', {
                                  station: name(station),
                                  city: cityName,
                                })}
                                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline sm:ms-auto"
                              >
                                {t('map')}
                                <ArrowUpRight
                                  size={16}
                                  aria-hidden="true"
                                  className="rtl:-scale-x-100"
                                />
                              </a>
                            </li>
                          ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </>
        )}
        <p className="mt-8 flex items-start gap-2 text-xs leading-6 text-muted-foreground">
          <Info size={16} aria-hidden="true" className="mt-1 shrink-0" />
          {t('mapNote')}
        </p>
        <section className="mt-10 flex flex-col gap-5 rounded-xl bg-secondary p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
          <div>
            <h2 className="text-xl font-semibold">{t('ctaTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('ctaText')}
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/#trip-search-title">
              <BusFront size={18} aria-hidden="true" />
              {t('cta')}
            </Link>
          </Button>
        </section>
      </div>
    </>
  );
}
