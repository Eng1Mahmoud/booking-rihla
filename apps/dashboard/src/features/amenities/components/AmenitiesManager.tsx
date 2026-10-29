'use client';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { useQuery } from '@tanstack/react-query';
import { Plus, Wifi } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getAmenitiesAction } from '../actions/amenity.actions';
import { useAmenityColumns } from '../hooks/useAmenityColumns';
import { type Amenity } from '../types/amenity';
import { AmenityEditor } from './AmenityEditor';
const emptyRows: Amenity[] = [];
export function AmenitiesManager() {
  const t = useTranslations('Amenities');
  const locale = useLocale();
  const list = useDataTableState({ initialFilters: {} });

  const query = useQuery({
    queryKey: ['fleet', locale, 'amenities', list.params],
    queryFn: () =>
      invokeAction(() =>
        getAmenitiesAction({
          search: list.params.search,
          limit: list.params.limit,
          offset: list.params.offset,
        }),
      ),
  });
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
          disabled={!query.data}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addAmenity')}
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
          state={list}
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
              title={t(list.hasFilters ? 'noResults' : 'noAmenities')}
              description={t(
                list.hasFilters ? 'noResultsHint' : 'noAmenitiesHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && query.data && (
        <AmenityEditor {...page.editor} onCloseAutoFocus={page.focus.restore} />
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
