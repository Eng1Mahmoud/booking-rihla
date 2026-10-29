'use client';
import { Plus, Route as RouteIcon } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { DataTable } from '@/shared/components/tables';
import { ListError, EmptyState } from '@/shared/components/feedback';
import { ConfirmDialog } from '@/shared/components/dialogs';
import { useRoutes } from '../hooks/useRoutes';
import { RouteEditor } from './RouteEditor';
import { RouteFilters } from './RouteFilters';
export function RoutesManager() {
  const page = useRoutes(),
    t = page.t;
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
          disabled={!page.query.data || page.stations.length < 2}
          className="min-h-12"
        >
          <Plus aria-hidden="true" />
          {t('add')}
        </Button>
      </div>
      <p role="status" aria-live="polite" className="mb-4 text-sm text-primary">
        {page.notice}
      </p>
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
          data={page.query.data?.items ?? []}
          rowCount={page.query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-200 [&_td]:wrap-anywhere"
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          onRefresh={page.refresh}
          filters={(state) => (
            <RouteFilters
              state={state}
              stations={page.stations}
              disabled={page.query.isFetching}
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
          stations={page.stations}
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
