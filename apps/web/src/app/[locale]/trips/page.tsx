import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { RefreshPage } from '@/shared/components/feedback/RefreshPage';
import { getTripCatalog, getTrips } from '@/features/trips/lib/trips.server';
import { getApiDataOrThrow } from '@/shared/lib/apiResult';
import { TripResults } from '@/features/trips/components/TripResults';
import { searchSchema } from '@/features/trips/schemas/searchSchema';
export default async function TripsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'ar' | 'en' }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await params;
  const raw = await searchParams;
  const t = await getTranslations('Trips');
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success)
    return (
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-8 md:py-14">
        <EmptyState heading="h1" title={t('invalid')} role="alert">
          <Button asChild className="h-12">
            <Link href="/">{t('back')}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  const search = parsed.data;
  let data;
  try {
    data = await Promise.all([
      getTripCatalog().then(getApiDataOrThrow),
      getTrips(search)
        .then(getApiDataOrThrow)
        .then((page) => page.items),
    ]);
  } catch {
    return (
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-8 md:py-14">
        <EmptyState heading="h1" title={t('error')} role="alert">
          <RefreshPage label={t('retry')} />
          <Button asChild variant="outline" className="h-12 bg-card">
            <Link href="/">{t('back')}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }
  const [catalog, all] = data;
  return (
    <TripResults
      key={JSON.stringify(search)}
      search={search}
      initialCatalog={catalog}
      initialTrips={all}
    />
  );
}
