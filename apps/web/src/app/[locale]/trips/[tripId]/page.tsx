import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { RefreshPage } from '@/shared/components/feedback/RefreshPage';
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
  const [t, trips] = await Promise.all([
    getTranslations('Detail'),
    getTranslations('Trips'),
  ]);
  if (!z.uuid().safeParse(tripId).success) notFound();
  let data;
  try {
    data = await Promise.all([
      apiFetch<Trip>('trips/' + tripId + '/details').then(unwrapApiResult),
      apiFetch<SeatList>('trips/' + tripId + '/seats').then(unwrapApiResult),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <div className="mx-auto w-[calc(100%-2rem)] max-w-[1180px] py-8 md:py-14">
        <EmptyState heading="h1" title={t('error')} role="alert">
          <RefreshPage label={trips('retry')} />
          <Button asChild variant="outline" className="h-12 bg-card">
            <Link href="/">{t('back')}</Link>
          </Button>
        </EmptyState>
      </div>
    );
  }
  const [trip, seats] = data;
  return <TripDetails initial={trip} seats={seats} />;
}
