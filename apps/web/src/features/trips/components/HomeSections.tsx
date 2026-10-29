import { getLocale, getTranslations } from 'next-intl/server';
import {
  ArrowLeft,
  Armchair,
  BusFront,
  ChevronDown,
  MapPin,
  Ticket,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import type { TripCatalog } from '../types/trip';
import { SeatPreview } from './SeatPreview';

const steps = [
  { Icon: BusFront, title: 'step1Title', text: 'step1Text' },
  { Icon: Armchair, title: 'step2Title', text: 'step2Text' },
  { Icon: Ticket, title: 'step3Title', text: 'step3Text' },
] as const;
const questions = ['account', 'deadline', 'issued'] as const;

export async function HomeSections({ catalog }: { catalog?: TripCatalog }) {
  const [t, faq, locale] = await Promise.all([
    getTranslations('Home'),
    getTranslations('FAQ'),
    getLocale(),
  ]);
  const name = (item: { nameAr: string; nameEn: string }) =>
    locale === 'ar' ? item.nameAr : item.nameEn;
  const stationCities =
    catalog?.cities
      .flatMap((city) => {
        const stations = catalog.stations.filter(
          (station) => station.cityId === city.id,
        );
        return stations.length ? [{ city, stations }] : [];
      })
      .slice(0, 3) ?? [];

  return (
    <>
      <section
        id="how-it-works"
        aria-labelledby="home-how-title"
        className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] gap-9 py-14 md:py-22 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-20"
      >
        <div>
          <h2
            id="home-how-title"
            className="max-w-lg text-3xl font-semibold leading-relaxed md:text-[36px]"
          >
            {t('howTitle')}
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground md:text-base">
            {t('howText')}
          </p>
          <ol className="mt-8 space-y-7">
            {steps.map(({ Icon, title, text }, index) => (
              <li key={title} className="grid grid-cols-[44px_1fr] gap-x-4">
                <span className="flex size-11 items-center justify-center rounded-full border border-primary/25 bg-secondary text-sm font-semibold text-primary">
                  {new Intl.NumberFormat(locale).format(index + 1)}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <Icon
                      size={19}
                      className="text-primary"
                      aria-hidden="true"
                    />
                    {t(title)}
                  </h3>
                  <p className="mt-1.5 max-w-md text-sm leading-7 text-muted-foreground">
                    {t(text)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <SeatPreview />
      </section>
      <section
        aria-labelledby="home-stations-title"
        className="border-y bg-card"
      >
        <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] gap-9 py-10 md:py-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <MapPin
              size={30}
              className="mb-4 text-primary"
              aria-hidden="true"
            />
            <h2
              id="home-stations-title"
              className="text-2xl font-semibold md:text-[34px]"
            >
              {t('stationsTitle')}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-8 text-muted-foreground">
              {t('stationsText')}
            </p>
            <Button asChild variant="outline" size="lg" className="mt-6">
              <Link href="/stations">
                {t('stationsLink')}
                <ArrowLeft
                  size={18}
                  className="ltr:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            </Button>
          </div>
          {stationCities.length > 0 ? (
            <ul className="divide-y border-y">
              {stationCities.map(({ city, stations }) => (
                <li key={city.id} className="flex items-start gap-4 py-5">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <MapPin
                      size={19}
                      className="text-primary"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{name(city)}</h3>
                    <p className="mt-1 text-sm leading-7 text-muted-foreground">
                      {stations
                        .slice(0, 2)
                        .map(name)
                        .join(locale === 'ar' ? '، ' : ', ')}
                    </p>
                  </div>
                  <span className="shrink-0 pt-1 text-xs leading-6 text-muted-foreground">
                    {t('stationCount', { count: stations.length })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-5 rounded-xl bg-secondary p-6">
              <BusFront
                size={44}
                className="shrink-0 text-primary"
                aria-hidden="true"
              />
              <p className="max-w-sm text-sm leading-8 text-muted-foreground">
                {t('stationTip')}
              </p>
            </div>
          )}
        </div>
      </section>
      <section
        aria-labelledby="home-faq-title"
        className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] gap-6 py-14 md:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
      >
        <div>
          <h2
            id="home-faq-title"
            className="text-2xl font-semibold md:text-[34px]"
          >
            {t('faqTitle')}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
            {t('faqText')}
          </p>
          <Link
            href="/faqs"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t('faqLink')}
            <ArrowLeft
              size={17}
              className="ltr:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
        <div className="divide-y border-y">
          {questions.map((key) => (
            <details key={key} className="group">
              <summary className="flex min-h-17 cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-semibold md:text-base [&::-webkit-details-marker]:hidden">
                <span>{faq('questions.' + key + '.q')}</span>
                <ChevronDown
                  size={19}
                  className="motion-safe:transition-transform motion-safe:duration-200 shrink-0 text-primary group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-5 text-sm leading-8 text-muted-foreground">
                {faq('questions.' + key + '.a')}
              </p>
            </details>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="home-ready-title"
        className="border-t bg-secondary"
      >
        <div className="mx-auto flex w-[calc(100%-2rem)] max-w-[1240px] flex-col gap-6 py-9 md:flex-row md:items-center md:justify-between md:py-12">
          <div>
            <h2 id="home-ready-title" className="text-2xl font-semibold">
              {t('readyTitle')}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t('readyText')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <a href="#trip-search-title">
                {t('readySearch')}
                <ArrowLeft
                  size={18}
                  className="ltr:rotate-180"
                  aria-hidden="true"
                />
              </a>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/about">{t('aboutLink')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
