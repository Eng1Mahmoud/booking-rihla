'use client';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { errorMessage } from '@/shared/lib/apiResult';
import { BusFront, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useBusTypeColumns } from '../hooks/useBusTypeColumns';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getBusTypesAction } from '../actions/busType.actions';
import { type BusType } from '../types/busType';
import { BusTypeEditor } from './BusTypeEditor';
const emptyRows: BusType[] = [];
export function BusTypesManager() {
  const { query, hasActiveFilters } = useTableQuery({
    action: getBusTypesAction,
    queryKey: ['fleet', 'bus-types'],
  });

  const t = useTranslations('BusTypes');
  const locale = useLocale();

  const { columns, ...page } = useBusTypeColumns();
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
            {t('bus-typesTitle')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('bus-typesIntro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          className="min-h-12 shrink-0"
          disabled={!query.data}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addBusType')}
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
          caption={t('bus-typesTitle')}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          search={{
            label: t('searchBusTypes'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={refresh}
          emptyState={
            <EmptyState
              icon={BusFront}
              title={t(hasActiveFilters ? 'noResults' : 'noBusTypes')}
              description={t(
                hasActiveFilters ? 'noResultsHint' : 'noBusTypesHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && query.data && (
        <BusTypeEditor {...page.editor} onCloseAutoFocus={page.focus.restore} />
      )}
      {page.confirmation.open && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('deleteBusType')}
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
            {t('busTypeDeleteHint')}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
