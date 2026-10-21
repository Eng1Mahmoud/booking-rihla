import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { readTripCatalog } from '@/features/trips/lib/trips.server';
import { StationDirectory } from '@/features/stations/components/StationDirectory';

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
  const catalog = await readTripCatalog();
  return (
    <StationDirectory initial={catalog.success ? catalog.data : undefined} />
  );
}
