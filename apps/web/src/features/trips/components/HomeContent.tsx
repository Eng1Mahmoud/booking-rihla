'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BusFront, Armchair, Ticket, ArrowUpLeft } from 'lucide-react';
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
const steps = [
  { Icon: BusFront, title: 'step1Title', text: 'step1Text' },
  { Icon: Armchair, title: 'step2Title', text: 'step2Text' },
  { Icon: Ticket, title: 'step3Title', text: 'step3Text' },
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
      <section className="relative isolate h-[315px] overflow-hidden bg-[#0b3552] md:h-[390px]">
        <Image
          src="https://images.unsplash.com/photo-1722264310337-92c342c9bfe3?auto=format&fit=crop&q=85&w=2200"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="-z-20 object-cover object-[center_57%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[#062032]/40 md:bg-transparent md:bg-linear-to-r md:from-[#062032]/65 md:via-[#062032]/25 md:to-transparent md:rtl:bg-linear-to-l"
        />
        <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] pt-10 text-white md:pt-16">
          <h1 className="max-w-[340px] text-3xl font-semibold leading-[1.5] text-white md:max-w-[600px] md:text-[44px]">
            {t('title')}
          </h1>
          <p className="mt-3 max-w-[330px] text-sm leading-relaxed text-slate-100 md:mt-4 md:max-w-[540px] md:text-base">
            {t('intro')}
          </p>
          <span className="mt-5 block text-xs text-slate-200 md:mt-8">
            {t('place')}
          </span>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-8 w-[calc(100%-2rem)] max-w-[1180px] md:-mt-12">
        <section
          className="rounded-xl border bg-card p-5 shadow-sm md:p-7"
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
          className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] pt-10 pb-8 md:pt-14 md:pb-10"
          aria-labelledby="popular-routes-title"
        >
          <h2 id="popular-routes-title" className="text-2xl font-semibold">
            {t('destinations')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('destinationsText')}
          </p>
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-2 xl:grid-cols-4">
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
                className="flex min-h-24 items-center justify-between gap-3 bg-card p-5 hover:bg-accent"
              >
                <div className="min-w-0">
                  <strong className="text-sm font-medium">
                    {t('cityNames.' + origin)}
                    <span className="text-muted-foreground"> — </span>
                    {t('cityNames.' + destination)}
                  </strong>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {t('viewTrips')}
                  </span>
                </div>
                <ArrowUpLeft
                  size={22}
                  aria-hidden="true"
                  className="shrink-0 text-primary ltr:rotate-90"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="mx-auto grid w-[calc(100%-2rem)] max-w-[1180px] gap-7 py-10 md:grid-cols-3 md:gap-10 md:pb-16">
        {steps.map(({ Icon, title, text }) => (
          <div key={title} className="grid grid-cols-[32px_1fr] gap-x-4">
            <Icon
              size={27}
              aria-hidden="true"
              className="row-span-2 mt-1 text-primary"
            />
            <h3 className="font-medium">{t(title)}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t(text)}
            </p>
          </div>
        ))}
      </section>
    </>
  );
}
