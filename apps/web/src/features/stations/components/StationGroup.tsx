'use client';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { StationGroupData } from '../hooks/useStationDirectory';
import { displayName } from '@/shared/lib';

export function StationGroup({ id, city, stations }: StationGroupData) {
  const t = useTranslations('Stations');
  const locale = useLocale() as 'ar' | 'en';
  const name = (item: { nameAr: string; nameEn: string }) =>
    displayName(item, locale);
  const cityName = city ? name(city) : t('otherCity');
  const collator = new Intl.Collator(locale);

  return (
    <section
      aria-labelledby={'city-' + id}
      className="grid gap-4 md:grid-cols-[220px_1fr] md:gap-8"
    >
      <div className="pt-2">
        <h2 id={'city-' + id} className="text-xl font-semibold md:text-2xl">
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
              id={'station-' + station.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:flex-nowrap md:px-6"
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
              >
                <MapPin size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-medium wrap-anywhere">{name(station)}</h3>
                <p
                  className="mt-1 text-xs text-muted-foreground"
                  lang={locale === 'ar' ? 'en' : 'ar'}
                >
                  <bdi>{locale === 'ar' ? station.nameEn : station.nameAr}</bdi>
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
}
