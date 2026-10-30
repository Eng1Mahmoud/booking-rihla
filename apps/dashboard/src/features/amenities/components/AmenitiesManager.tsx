'use client';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { errorMessage } from '@/shared/lib/apiResult';
import { Plus, Wifi } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getAmenitiesAction } from '../actions/amenity.actions';
import { useAmenityColumns } from '../hooks/useAmenityColumns';
import { type Amenity } from '../types/amenity';

const emptyRows: Amenity[] = [];
export function AmenitiesManager() {
  const urlParams = useSearchParams();

  const { query, hasActiveFilters } = useTableQuery({
    action: getAmenitiesAction,
    queryKey: ['fleet', 'amenities'],
  });

  const t = useTranslations('Amenities');
  const locale = useLocale();

  const { columns, ...page } = useAmenityColumns();
  function refresh() {
    page.clearNotice();
    void query.refetch();
  }

  return (
    <section aria-labelledby="catalog-title">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            id="catalog-title"
            className="text-[clamp(28px,2.6vw,38px)] leading-tight font-bold tracking-[-0.02em] text-balance"
          >
            {t('amenitiesTitle')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('amenitiesIntro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          className="min-h-12 shrink-0"
          asChild
        >
          <Link
            href={'/dashboard/amenities/new?' + urlParams.toString()}
            prefetch={false}
          >
            <Plus aria-hidden="true" />
            {t('addAmenity')}
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
          caption={t('amenitiesTitle')}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          search={{
            label: t('searchAmenities'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={refresh}
          emptyState={
            <EmptyState
              icon={Wifi}
              title={t(hasActiveFilters ? 'noResults' : 'noAmenities')}
              description={t(
                hasActiveFilters ? 'noResultsHint' : 'noAmenitiesHint',
              )}
            />
          }
        />
      )}

      {page.confirmation.open && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('deleteAmenity')}
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
            {t('amenityDeleteHint')}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
