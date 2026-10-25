'use client';
import { useTranslations } from 'next-intl';
import { Wifi, Plus } from 'lucide-react';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { useAmenities } from '../hooks/useAmenities';
import { AmenityEditor } from './AmenityEditor';
import type { Amenity } from '../types/amenity';
const emptyRows: Amenity[] = [];

export function AmenitiesManager() {
  const t = useTranslations('Amenities');
  const page = useAmenities();
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
          disabled={!page.canAdd}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addAmenity')}
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
          caption={t('amenitiesTitle')}
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          search={{
            label: t('searchAmenities'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={page.refresh}
          emptyState={
            <EmptyState
              icon={Wifi}
              title={t(page.list.hasFilters ? 'noResults' : 'noAmenities')}
              description={t(
                page.list.hasFilters ? 'noResultsHint' : 'noAmenitiesHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && page.query.data && (
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
