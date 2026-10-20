'use client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BusFront, Armchair, Ticket, ArrowUpLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { TripSearchForm } from './TripSearchForm';
import { useTripCatalog } from '../hooks/useTrips';
import type { TripCatalog } from '../types/trip';
export function HomeContent({
  initial,
  today,
}: {
  initial?: TripCatalog;
  today: string;
}) {
  const t = useTranslations('Home');
  const query = useTripCatalog(initial);
  const catalog = query.data;
  const pairs = [
    ['Cairo', 'Alexandria'],
    ['Giza', 'Alexandria'],
    ['Cairo', 'Hurghada'],
    ['Cairo', 'Sharm El Sheikh'],
  ];
  return (
    <>
      <section className="travel-hero">
        <Image
          src="https://images.unsplash.com/photo-1722264310337-92c342c9bfe3?auto=format&fit=crop&q=85&w=2200"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="hero-image"
        />
        <div className="hero-shade" />
        <div className="container-shell hero-copy">
          <h1>{t('title')}</h1>
          <p>{t('intro')}</p>
          <span className="hero-place">{t('place')}</span>
        </div>
      </section>
      <div className="container-shell home-search">
        <section className="search-panel">
          <div className="search-panel-title">
            <BusFront size={21} />
            <h2>{t('findTrip')}</h2>
            <span>{t('oneWay')}</span>
          </div>
          {catalog && catalog.cities.length > 1 ? (
            <TripSearchForm {...catalog} today={today} />
          ) : (
            <p role="alert" className="notice">
              {query.isPending
                ? t('findTrip')
                : catalog
                  ? t('noCities')
                  : t('apiUnavailable')}
              {query.isError && (
                <button
                  type="button"
                  className="text-button ms-3"
                  onClick={() => void query.refetch()}
                >
                  {t('findTrip')}
                </button>
              )}
            </p>
          )}
        </section>
      </div>
      <section className="container-shell destinations-section">
        <div className="section-heading">
          <div>
            <h2>{t('destinations')}</h2>
            <p>{t('destinationsText')}</p>
          </div>
        </div>
        <div className="route-links">
          {pairs.map(([origin, destination]) => {
            const from = catalog?.cities.find((city) => city.nameEn === origin);
            const to = catalog?.cities.find(
              (city) => city.nameEn === destination,
            );
            if (!from || !to) return null;
            return (
              <Link
                key={origin + destination}
                href={
                  '/trips?' +
                  new URLSearchParams({
                    originCityId: from.id,
                    destinationCityId: to.id,
                    travelDate: today,
                  })
                }
                className="route-link"
              >
                <div>
                  <strong>
                    {t('cityNames.' + origin)}
                    <span> — </span>
                    {t('cityNames.' + destination)}
                  </strong>
                  <span>{t('viewTrips')}</span>
                </div>
                <ArrowUpLeft size={23} className="ltr:rotate-90" />
              </Link>
            );
          })}
        </div>
      </section>
      <section className="container-shell how-it-works">
        <div>
          <BusFront size={27} />
          <h3>{t('step1Title')}</h3>
          <p>{t('step1Text')}</p>
        </div>
        <div>
          <Armchair size={27} />
          <h3>{t('step2Title')}</h3>
          <p>{t('step2Text')}</p>
        </div>
        <div>
          <Ticket size={27} />
          <h3>{t('step3Title')}</h3>
          <p>{t('step3Text')}</p>
        </div>
      </section>
    </>
  );
}
