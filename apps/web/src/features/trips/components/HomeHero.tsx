import Image from 'next/image';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Armchair, ArrowLeft, Check, MapPin } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export async function HomeHero({ children }: { children: ReactNode }) {
  const t = await getTranslations('Home');
  return (
    <section
      className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] pt-6 md:pt-8"
      aria-labelledby="home-title"
    >
      <div className="grid items-center gap-7 lg:grid-cols-[0.95fr_1.05fr] lg:gap-x-10 lg:gap-y-10">
        <div className="lg:py-8">
          <h1
            id="home-title"
            className="max-w-xl text-balance text-[36px] font-semibold leading-[1.4] tracking-tight sm:text-[44px] lg:text-[58px] lg:leading-[1.3]"
          >
            {t('title')}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-8 text-muted-foreground md:text-base">
            {t('intro')}
          </p>
          <p className="mt-3 flex items-center gap-2 text-xs text-primary">
            <MapPin size={14} aria-hidden="true" />
            {t('place')}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 md:mt-8">
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
          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground md:mt-8">
            {['heroStation', 'heroSeat', 'heroBooking'].map((key) => (
              <li key={key} className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 lg:col-span-2 lg:row-start-2">
          {children}
        </div>
        <div className="motion-safe:animate-[home-enter_700ms_100ms_ease-out_both] lg:col-start-2 lg:row-start-1 relative isolate h-[210px] overflow-hidden rounded-[1.75rem] bg-secondary sm:h-[310px] lg:h-[490px] lg:rounded-ss-[6rem]">
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
          <div className="absolute left-5 bottom-5 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/95 px-4 py-3 text-sm font-medium text-secondary-foreground shadow-sm backdrop-blur-sm md:bottom-6 md:left-6">
            <span className="flex size-9 items-center justify-center rounded-xl bg-secondary text-primary">
              <Armchair size={21} aria-hidden="true" />
            </span>
            {t('heroImageLabel')}
          </div>
        </div>
      </div>
    </section>
  );
}
