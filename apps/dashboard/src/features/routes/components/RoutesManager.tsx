'use client';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Route as RouteIcon } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  getRoutesAction,
  getRouteStationsAction,
} from '../actions/route.actions';
import { useRouteColumns } from '../hooks/useRouteColumns';
import { type RouteListQuery } from '../schemas/routeSchema';
import { RouteEditor } from './RouteEditor';
import { RouteFilters } from './RouteFilters';
export function RoutesManager() {
  const locale = useLocale();
  const client = useQueryClient();
  const list = useDataTableState<{
    originStationId: string;
    destinationStationId: string;
    isActive: RouteListQuery['isActive'];
  }>({
    initialFilters: {
      originStationId: '',
      destinationStationId: '',
      isActive: '',
    },
  });
  const query = useQuery({
    queryKey: ['routes', locale, list.params],
    queryFn: async () => {
      const [page, stations] = await Promise.all([
        invokeAction(() =>
          getRoutesAction({
            limit: list.params.limit,
            offset: list.params.offset,
            ...list.filters,
          }),
        ),
        client.fetchQuery({
          queryKey: ['catalog', locale, 'route-stations'],
          queryFn: () => invokeAction(getRouteStationsAction),
        }),
      ]);
      return { ...page, stations };
    },
  });
  const stations = query.data?.stations ?? [];
  const { columns, ...page } = useRouteColumns({
    stations,
  });
  async function refresh() {
    page.clearNotice();
    await client.invalidateQueries({
      queryKey: ['catalog', locale, 'route-stations'],
      refetchType: 'none',
    });
    await query.refetch();
  }

  const t = page.t;
  return (
    <section className="min-w-0" aria-labelledby="routes-title">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 id="routes-title" className="text-3xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('intro')}
          </p>
        </div>
        <Button
          ref={page.focus.fallbackRef}
          onClick={page.create}
          disabled={!query.data || stations.length < 2}
          className="min-h-12"
        >
          <Plus aria-hidden="true" />
          {t('add')}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="mb-4 text-sm text-primary">
        {page.notice}
      </p>
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
          data={query.data?.items ?? []}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-200 [&_td]:wrap-anywhere"
          isLoading={query.isPending}
          isFetching={query.isFetching}
          onRefresh={refresh}
          filters={(state) => (
            <RouteFilters
              state={state}
              stations={stations}
              disabled={query.isFetching}
            />
          )}
          emptyState={
            <EmptyState
              icon={RouteIcon}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.editorOpen && (
        <RouteEditor
          entry={page.editing}
          stations={stations}
          pending={page.save.isPending}
          onSave={(values) => page.save.mutateAsync(values)}
          onClose={page.closeEditor}
          onCloseAutoFocus={page.focus.restore}
        />
      )}{' '}
      {page.deleting && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('delete')}
          description={t('deleteHint', { name: page.deleteName })}
          pending={page.confirmation.pending}
          error={page.confirmation.error}
          onConfirm={page.confirmation.confirm}
          onCancel={page.closeConfirmation}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
    </section>
  );
}
