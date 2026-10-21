import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getTripCatalog } from '@/features/trips/lib/trips.server';
import { StationDirectory } from '@/features/stations/components/StationDirectory';
import { PageIntro } from '@/shared/components/layout/PageIntro';
import { Info, BusFront } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Stations' });
  return { title: t('metaTitle'), description: t('intro') };
}

export default async function StationsPage() {
  const [catalog, t] = await Promise.all([
    getTripCatalog(),
    getTranslations('Stations'),
  ]);
  return (
    <>
      <PageIntro
        title={t('title')}
        description={t('intro')}
        eyebrow={t('eyebrow')}
      />
      <StationDirectory initial={catalog.success ? catalog.data : undefined} />
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1240px] pb-10">
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
