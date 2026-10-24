import { getTripCatalog } from '@/features/trips/lib/trips.server';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { HomeHero } from '@/features/trips/components/HomeHero';
import { HomeSearch } from '@/features/trips/components/HomeSearch';
import { HomeSections } from '@/features/trips/components/HomeSections';
import { PopularRoutes } from '@/features/trips/components/PopularRoutes';
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
  const catalog = await getTripCatalog();
  const today = cairoDate();
  return (
    <>
      <HomeHero>
        <HomeSearch
          initial={catalog.success ? catalog.data : undefined}
          today={today}
        />
      </HomeHero>
      <PopularRoutes
        catalog={catalog.success ? catalog.data : undefined}
        today={today}
      />
      <HomeSections catalog={catalog.success ? catalog.data : undefined} />
    </>
  );
}
