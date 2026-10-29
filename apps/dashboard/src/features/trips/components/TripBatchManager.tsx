'use client';
import { errorMessage } from '@/shared/lib/apiResult';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ListError } from '@/shared/components/feedback/ListError';
import { useTripBatch } from '../hooks/useTripBatch';
import { TripBatchForm } from './TripBatchForm';
import { TripBatchPreview } from './TripBatchPreview';

export function TripBatchManager() {
  const locale = useLocale();

  const page = useTripBatch();
  const t = useTranslations('Trips');
  return (
    <section className="min-w-0">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('batch')}</h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('batchHint')}
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/dashboard/trips">{t('backToTrips')}</Link>
        </Button>
      </div>
      {page.options.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(page.options.error, locale)}
          pending={page.options.isFetching}
          onRetry={() => {
            void page.options.refetch();
          }}
        />
      )}
      {page.options.isPending && <p role="status">{t('loading')}</p>}
      {page.options.data && (
        <TripBatchForm
          options={page.options.data}
          pending={page.pending}
          onPreview={page.preview.mutateAsync}
          onChange={page.clearReview}
        />
      )}
      {page.notice && (
        <p role="status" className="mt-5 text-primary">
          {page.notice}
        </p>
      )}
      {page.error && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{page.error}</AlertDescription>
        </Alert>
      )}
      {page.review && (
        <TripBatchPreview
          preview={page.review.preview}
          pending={page.pending}
          creating={page.create.isPending}
          onCreate={() => page.create.mutate()}
        />
      )}
    </section>
  );
}
