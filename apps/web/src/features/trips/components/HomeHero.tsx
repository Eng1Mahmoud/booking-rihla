import Image from 'next/image';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Armchair, ArrowLeft, Check, MapPin } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export async function HomeHero({ children }: { children: ReactNode }) {
  const t = await getTranslations('Home');
  return (
    <section
      className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] pt-4 sm:pt-6 md:pt-8"
      aria-labelledby="home-title"
    >
      <div className="grid items-center gap-5 lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-10 lg:gap-y-10">
        <div className="lg:py-8">
          <h1
            id="home-title"
            className="max-w-xl text-balance text-[32px] font-semibold leading-[1.35] tracking-tight sm:text-[44px] lg:text-[58px] lg:leading-[1.3]"
          >
            {t('title')}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground md:text-base lg:mt-4 lg:leading-8">
            {t('intro')}
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs text-primary lg:mt-3">
            <MapPin size={14} aria-hidden="true" />
            {t('place')}
          </p>
          <div className="mt-5 hidden flex-wrap items-center gap-x-6 gap-y-2 md:mt-8 lg:flex">
            <Button asChild size="lg" className="rounded-full px-7">
              <a href="#trip-search-title">
                {t('readySearch')}
                <ArrowLeft
                  size={18}
                  aria-hidden="true"
                  className="ltr:rotate-180"
                />
              </a>
            </Button>
            <a
              href="#how-it-works"
              className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-border underline-offset-8 hover:text-primary hover:decoration-primary"
            >
              {t('howLink')}
            </a>
          </div>
          <ul className="mt-5 hidden flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground md:mt-8 lg:flex">
            {['heroStation', 'heroSeat', 'heroBooking'].map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:motion-safe:animate-[home-enter_700ms_100ms_ease-out_both] lg:col-start-2 lg:row-start-1 relative isolate h-44 overflow-hidden rounded-lg bg-secondary sm:h-[310px] sm:rounded-[1.75rem] lg:h-[490px] lg:rounded-ss-[6rem]">
          <Image
            src="/images/rihla-coastal-journey.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 620px, (min-width: 1024px) 52vw, calc(100vw - 32px)"
            className="object-cover object-[80%_65%]"
          />
          <div
            className="absolute inset-0 bg-linear-to-t from-secondary-foreground/35 via-transparent to-transparent"
            aria-hidden="true"
          />
          <div className="absolute left-3 top-3 flex items-center gap-2 rounded-xl border border-white/50 bg-white/95 px-3 py-2 text-xs font-medium text-secondary-foreground shadow-sm md:top-auto md:bottom-6 md:left-6 lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-3 lg:text-sm lg:backdrop-blur-sm">
            <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-primary lg:size-9 lg:rounded-xl">
              <Armchair className="size-4 lg:size-[21px]" aria-hidden="true" />
            </span>
            {t('heroImageLabel')}
          </div>
        </div>
        <div className="relative z-10 -mt-10 lg:col-span-2 lg:row-start-2 lg:mt-0">
          {children}
        </div>
      </div>
    </section>
  );
}
