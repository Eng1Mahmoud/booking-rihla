import { readTripCatalog } from '@/features/trips/lib/trips.server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeHero } from '@/features/trips/components/HomeHero';
import { HomeContent } from '@/features/trips/components/HomeContent';
import { HomeSections } from '@/features/trips/components/HomeSections';
import { cairoDate } from '@/features/trips/schemas/searchSchema';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });
  return { title: t('metaTitle'), description: t('intro') };
}
export default async function HomePage() {
  const catalog = await readTripCatalog();
  return (
    <>
      <HomeHero />
      <HomeContent
        initial={catalog.success ? catalog.data : undefined}
        today={cairoDate()}
      />
      <HomeSections catalog={catalog.success ? catalog.data : undefined} />
    </>
  );
}
