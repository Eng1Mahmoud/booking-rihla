import { apiFetch } from '@/shared/lib/api';
import { z } from 'zod';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui';
import { EmptyState, RefreshPage } from '@/shared/components/feedback';
import { ApiError, getApiDataOrThrow } from '@/shared/lib';
import { type Trip, type SeatList, TripDetails } from '@/features/trips';
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
      apiFetch<Trip>('trips/' + tripId + '/details').then((result) =>
        getApiDataOrThrow(result),
      ),
      apiFetch<SeatList>('trips/' + tripId + '/seats').then((result) =>
        getApiDataOrThrow(result),
      ),
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
