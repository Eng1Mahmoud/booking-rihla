import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ApiError } from '@/shared/lib/apiResult';
import { apiFetch } from '@/shared/lib/api';
import { unwrapApiResult } from '@/shared/lib/apiResult';
import type { Trip, SeatList } from '@/features/trips/types/trip';
import { TripDetails } from '@/features/trips/components/TripDetails';
export default async function TripPage({
  params,
}: {
  params: Promise<{ locale: 'ar' | 'en'; tripId: string }>;
}) {
  const { tripId } = await params;
  const t = await getTranslations('Detail');
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tripId,
    )
  )
    notFound();
  let data;
  try {
    data = await Promise.all([
      apiFetch<Trip>('trips/' + tripId + '/details').then(unwrapApiResult),
      apiFetch<SeatList>('trips/' + tripId + '/seats').then(unwrapApiResult),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="container-shell page-space">
        <div className="empty-state" role="alert">
          <h1>{t('error')}</h1>
          <Link href="/" className="button-primary">
            {t('back')}
          </Link>
        </div>
      </div>
    );
  }
  const [trip, seats] = data;
  return <TripDetails initial={trip} seats={seats} />;
}
