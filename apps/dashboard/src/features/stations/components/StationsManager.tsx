'use client';
import { useTranslations } from 'next-intl';
import { MapPin, Plus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useStations } from '../hooks/useStations';
import { StationEditor } from './StationEditor';
import { StationCityFilter } from './StationCityFilter';
import type { StationRow } from '../types/station';
const emptyRows: StationRow[] = [];

export function StationsManager({ cityId = '' }: { cityId?: string }) {
  const t = useTranslations('Stations');
  const page = useStations(cityId);
  return (
    <section aria-labelledby="catalog-title" aria-busy={page.filterPending}>
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
          disabled={!page.canAdd}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addStation')}
        </Button>
      </div>
      <div role="status" aria-live="polite" className="text-sm text-primary">
        {page.notice && <p className="mb-4">{page.notice}</p>}
      </div>
      {page.query.isError && (
        <ListError
          title={t('readFailed')}
          description={t(page.query.data ? 'staleHint' : 'readFailedHint')}
          pending={page.query.isFetching}
          onRetry={page.refresh}
        />
      )}
      {(page.query.isPending || page.query.data) && (
        <DataTable
          state={page.list}
          columns={page.columns}
          data={page.query.data?.items ?? emptyRows}
          rowCount={page.query.data?.total}
          getRowId={(row) => row.id}
          caption={t('stationsTitle')}
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          search={{
            label: t('searchStations'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={page.refresh}
          filters={(controls) => (
            <StationCityFilter
              cities={page.cities}
              value={controls.filters.cityId}
              onChange={page.changeCity}
              disabled={page.filterPending}
            />
          )}
          onResetFilters={page.resetFilters}
          beforeTable={
            page.query.data && !page.cities.length ? (
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
              title={t(page.list.hasFilters ? 'noResults' : 'noStations')}
              description={t(
                page.list.hasFilters ? 'noResultsHint' : 'noStationsHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && page.query.data && (
        <StationEditor
          {...page.editor}
          cities={page.cities}
          cityId={page.list.filters.cityId}
          onCloseAutoFocus={page.focus.restore}
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
