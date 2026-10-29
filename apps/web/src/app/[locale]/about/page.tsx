import Image from 'next/image';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  BusFront,
  MapPin,
  ArrowLeft,
  CircleHelp,
  Armchair,
  Ticket,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'About' });
  return { title: t('metaTitle'), description: t('intro') };
}

const steps = [
  { key: 'trip', Icon: MapPin },
  { key: 'seat', Icon: Armchair },
  { key: 'ticket', Icon: Ticket },
] as const;

export default async function AboutPage() {
  const t = await getTranslations('About');
  return (
    <>
      <section className="overflow-hidden border-b bg-secondary/60">
        <div className="mx-auto grid w-[calc(100%-2rem)] max-w-[1240px] items-center gap-9 py-10 md:py-16 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div>
            <p className="mb-3 text-sm font-medium text-primary">
              {t('eyebrow')}
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold leading-[1.5] tracking-tight md:text-[48px] md:leading-[1.35]">
              {t('title')}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground md:text-base md:leading-8">
              {t('intro')}
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/#trip-search-title">
                {t('cta')}
                <ArrowLeft
                  size={18}
                  aria-hidden="true"
                  className="ltr:rotate-180"
                />
              </Link>
            </Button>
          </div>
          <div
            aria-hidden="true"
            className="relative isolate overflow-hidden rounded-[2rem] bg-secondary-foreground p-6 text-white sm:p-8"
          >
            <Image
              src="/images/rihla-coastal-journey.webp"
              alt=""
              fill
              sizes="(min-width: 1024px) 500px, 100vw"
              className="-z-10 object-cover object-[70%_center] opacity-15"
            />
            <div className="flex items-center justify-between gap-5 border-b border-white/20 pb-5">
              <span dir="ltr" className="text-3xl font-semibold">
                Rihla.
              </span>
              <BusFront size={36} strokeWidth={1.4} />
            </div>
            <p className="mt-6 text-lg font-medium">{t('journeyTitle')}</p>
            <div className="my-6 flex items-center gap-3" dir="ltr">
              <span className="size-3 shrink-0 rounded-full border-2 border-white" />
              <span className="w-full border-t-2 border-dashed border-white/35" />
              <BusFront size={26} className="shrink-0" />
              <span className="w-full border-t-2 border-dashed border-white/35" />
              <MapPin size={22} className="shrink-0" />
            </div>
            <div className="flex justify-between gap-4 text-sm text-white/80">
              <span>{t('origin')}</span>
              <span>{t('destination')}</span>
            </div>
            <p className="mt-7 border-t border-white/20 pt-5 text-sm leading-7 text-white/80">
              {t('journeyText')}
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] py-10 md:py-14">
        <section
          className="grid gap-5 border-b pb-10 md:grid-cols-[280px_1fr] md:gap-12 md:pb-14"
          aria-labelledby="about-purpose"
        >
          <h2 id="about-purpose" className="text-2xl font-semibold">
            {t('purposeTitle')}
          </h2>
          <div className="max-w-3xl space-y-4 text-sm leading-8 text-muted-foreground md:text-base">
            <p>{t('purposeText')}</p>
            <p>{t('purposeDetail')}</p>
          </div>
        </section>
        <section className="py-10 md:py-14" aria-labelledby="about-how">
          <h2 id="about-how" className="text-2xl font-semibold">
            {t('howTitle')}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            {t('howText')}
          </p>
          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0">
            {steps.map(({ key, Icon }, index) => (
              <li
                key={key}
                className="border-s-2 border-primary/20 ps-5 md:pe-8"
              >
                <div className="mb-4 flex items-center gap-3 text-primary">
                  <span className="text-sm font-semibold">
                    {t('stepNumber', { number: index + 1 })}
                  </span>
                  <Icon size={21} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">
                  {t('steps.' + key + '.title')}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {t('steps.' + key + '.text')}
                </p>
              </li>
            ))}
          </ol>
        </section>
        <section
          aria-labelledby="about-explore"
          className="border-t pt-9 md:pt-12"
        >
          <h2 id="about-explore" className="text-2xl font-semibold">
            {t('exploreTitle')}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Link
              href="/stations"
              className="group flex items-start gap-4 rounded-xl border bg-card p-6 hover:border-primary/40"
            >
              <MapPin
                size={25}
                aria-hidden="true"
                className="mt-1 shrink-0 text-primary"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold group-hover:text-primary">
                  {t('stationsTitle')}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t('stationsText')}
                </p>
              </div>
              <ArrowLeft
                size={18}
                aria-hidden="true"
                className="mt-1 shrink-0 text-primary ltr:rotate-180"
              />
            </Link>
            <Link
              href="/faqs"
              className="group flex items-start gap-4 rounded-xl border bg-card p-6 hover:border-primary/40"
            >
              <CircleHelp
                size={25}
                aria-hidden="true"
                className="mt-1 shrink-0 text-primary"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold group-hover:text-primary">
                  {t('faqsTitle')}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {t('faqsText')}
                </p>
              </div>
              <ArrowLeft
                size={18}
                aria-hidden="true"
                className="mt-1 shrink-0 text-primary ltr:rotate-180"
              />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
