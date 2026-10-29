'use client';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import { BusFront, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getBusOptionsAction, getBusesAction } from '../actions/bus.actions';
import { useBusColumns } from '../hooks/useBusColumns';
import { type Bus } from '../types/bus';
import { BusEditor } from './BusEditor';
import { BusFilters } from './BusFilters';
const emptyRows: Bus[] = [];
export function BusesManager() {
  const t = useTranslations('Buses');
  const locale = useLocale();
  const list = useDataTableState<{
    busTypeId: string;
    isActive: '' | 'true' | 'false';
  }>({ initialFilters: { busTypeId: '', isActive: '' } });
  const client = useQueryClient();

  const busOptions = queryOptions({
    queryKey: ['fleet', locale, 'bus-options'],
    queryFn: () => invokeAction(getBusOptionsAction),
    staleTime: 30000,
  });
  const params = {
    search: list.params.search,
    limit: list.params.limit,
    offset: list.params.offset,
    busTypeId: list.filters.busTypeId,
    isActive: list.filters.isActive,
  };
  const query = useQuery({
    queryKey: ['fleet', locale, 'buses', params],
    queryFn: async () => {
      const [page, options] = await Promise.all([
        invokeAction(() =>
          getBusesAction({
            search: list.params.search,
            limit: list.params.limit,
            offset: list.params.offset,
            busTypeId: list.filters.busTypeId,
            isActive: list.filters.isActive,
          }),
        ),
        client.fetchQuery(busOptions),
      ]);
      return { ...page, options };
    },
  });
  const { columns, ...page } = useBusColumns();
  async function refresh() {
    page.clearNotice();
    await client.invalidateQueries({
      queryKey: busOptions.queryKey,
      refetchType: 'none',
    });
    return query.refetch();
  }

  return (
    <section aria-labelledby="catalog-title">
      <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1
            id="catalog-title"
            className="text-[clamp(28px,2.6vw,38px)] leading-tight font-bold tracking-[-0.02em] text-balance"
          >
            {t('busesTitle')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('busesIntro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          className="min-h-12 shrink-0"
          disabled={!query.data}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addBus')}
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
          caption={t('busesTitle')}
          isLoading={query.isPending}
          isFetching={query.isFetching}
          search={{
            label: t('searchBuses'),
            placeholder: t('searchPlaceholder'),
          }}
          filters={(state) => (
            <BusFilters
              options={query.data?.options}
              typeId={state.filters.busTypeId}
              status={state.filters.isActive}
              onTypeChange={(value) => state.setFilter('busTypeId', value)}
              onStatusChange={(value) => state.setFilter('isActive', value)}
              disabled={!query.data}
            />
          )}
          onRefresh={refresh}
          emptyState={
            <EmptyState
              icon={BusFront}
              title={t(list.hasFilters ? 'noResults' : 'noBuses')}
              description={t(list.hasFilters ? 'noResultsHint' : 'noBusesHint')}
            />
          }
        />
      )}
      {page.editorOpen && query.data && (
        <BusEditor
          {...page.editor}
          options={query.data.options}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
      {page.confirmation.open && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('deleteBus')}
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
            {t('busDeleteHint')}
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}
