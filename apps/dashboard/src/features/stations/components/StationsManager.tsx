'use client';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { errorMessage } from '@/shared/lib/apiResult';
import { MapPin, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useStationColumns } from '../hooks/useStationColumns';
import { useStationsQuery } from '../hooks/useStationsQuery';
import { type StationRow } from '../types/station';
import { StationFilters } from './StationFilters';
const emptyRows: StationRow[] = [];
export function StationsManager() {
  const urlParams = useSearchParams();

  const {
    query,
    refresh: refreshQuery,
    cities,
    hasActiveFilters,
  } = useStationsQuery();

  const t = useTranslations('Stations');
  const locale = useLocale();

  const { columns, ...page } = useStationColumns();

  function refresh() {
    page.clearNotice();
    void refreshQuery();
  }

  return (
    <section aria-labelledby="catalog-title" aria-busy={query.isFetching}>
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            id="catalog-title"
            className="text-[clamp(28px,2.6vw,38px)] leading-tight font-bold tracking-[-0.02em] text-balance"
          >
            {t('stationsTitle')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('stationsIntro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          className="min-h-12 shrink-0"
          asChild
        >
          <Link
            href={'/dashboard/stations/new?' + urlParams.toString()}
            prefetch={false}
          >
            <Plus aria-hidden="true" />
            {t('addStation')}
          </Link>
        </Button>
      </div>
      <div role="status" aria-live="polite" className="text-sm text-primary">
        {page.notice && <p className="mb-4">{page.notice}</p>}
      </div>
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(query.error, locale)}
          pending={query.isFetching}
          onRetry={refresh}
        />
      )}
      {(query.isPending || query.data) && (
        <DataTable
          columns={columns}
          data={query.data?.items ?? emptyRows}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('stationsTitle')}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          search={{
            label: t('searchStations'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={refresh}
          filters={
            <StationFilters cities={cities} disabled={query.isFetching} />
          }
          beforeTable={
            query.data && !cities.length ? (
              <p className="mx-5 mb-5 rounded-[12px] bg-secondary p-4 text-sm">
                {t('needsCity')}{' '}
                <Link
                  href="/dashboard/cities"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {t('manageCities')}
                </Link>
              </p>
            ) : undefined
          }
          emptyState={
            <EmptyState
              icon={MapPin}
              title={t(hasActiveFilters ? 'noResults' : 'noStations')}
              description={t(
                hasActiveFilters ? 'noResultsHint' : 'noStationsHint',
              )}
            />
          }
        />
      )}

      {page.confirmation.open && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('deleteStation')}
          description={t('deleteDescription', { name: page.confirmation.name })}
          confirmLabel={t('confirmDelete')}
          pendingLabel={t('deleting')}
          pending={page.confirmation.pending}
          error={page.confirmation.error}
          onConfirm={page.confirmation.onConfirm}
          onCancel={page.confirmation.onCancel}
          onCloseAutoFocus={page.focus.restore}
        >
          <p className="mt-3 text-sm text-muted-foreground">
            {t('stationDeleteHint')}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
