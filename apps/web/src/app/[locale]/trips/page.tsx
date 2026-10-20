import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { readTripCatalog, readTrips } from '@/features/trips/lib/trips.server';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import { TripResults } from '@/features/trips/components/TripResults';
import {
  searchSchema,
  searchHref,
} from '@/features/trips/schemas/searchSchema';
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
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('invalid')}</h1>
          <Link href="/" className="button-primary">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  const search = parsed.data;
  let data;
  try {
    data = await Promise.all([
      readTripCatalog().then(unwrapApiResult),
      readTrips(search)
        .then(unwrapApiResult)
        .then((page) => page.items),
    ]);
  } catch {
    return (
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('error')}</h1>
          <Link href={searchHref(search)} className="button-primary">
            {t('retry')}
          </Link>
          <Link href="/" className="text-button">
            {t('back')}
          </Link>
        </div>
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
