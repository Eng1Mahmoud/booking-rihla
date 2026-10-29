'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableCaption,
} from '@/shared/components/ui/table';
import { formatReportTime } from '@/features/dashboard/lib/format';
import type { BatchPreview } from '../schemas/tripSchema';

export function TripBatchPreview({
  preview,
  pending,
  creating,
  onCreate,
}: {
  preview: BatchPreview;
  pending: boolean;
  creating: boolean;
  onCreate: () => void;
}) {
  const t = useTranslations('Trips');
  const locale = useLocale();

  // Keep this preview table simple: it displays the batch before it is saved.
  return (
    <section className="mt-8 min-w-0" aria-labelledby="batch-review-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="batch-review-title" className="text-xl font-semibold">
            {t('reviewCount', { count: preview.totalTrips })}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(preview.canCreate ? 'readyToCreate' : 'conflictsFound')}
          </p>
        </div>
        <Button
          disabled={!preview.canCreate || pending}
          onClick={onCreate}
          className="min-h-12"
        >
          {t(creating ? 'creatingBatch' : 'createBatch', {
            count: preview.totalTrips,
          })}
        </Button>
      </div>
      <div className="min-w-0 overflow-hidden rounded-2xl border bg-card">
        <Table className="min-w-160">
          <TableCaption className="sr-only">{t('batch')}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>{t('departure')}</TableHead>
              <TableHead>{t('arrival')}</TableHead>
              <TableHead>{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.trips.map((trip) => (
              <TableRow key={trip.date}>
                <TableCell>
                  {formatReportTime(trip.departureAt, locale)}
                </TableCell>
                <TableCell>
                  {formatReportTime(trip.arrivalAt, locale)}
                </TableCell>
                <TableCell>
                  {trip.conflicts.length
                    ? t('conflictCount', { count: trip.conflicts.length })
                    : t('noConflict')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
