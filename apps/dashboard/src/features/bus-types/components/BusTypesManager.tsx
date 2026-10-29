'use client';
import { useTranslations } from 'next-intl';
import { BusFront, Plus } from 'lucide-react';
import { DataTable } from '@/shared/components/tables';
import { Button } from '@/shared/components/ui';
import { EmptyState, ListError } from '@/shared/components/feedback';
import { ConfirmDialog } from '@/shared/components/dialogs';
import { useBusTypes } from '../hooks/useBusTypes';
import { BusTypeEditor } from './BusTypeEditor';
import type { BusType } from '../types/busType';
const emptyRows: BusType[] = [];

export function BusTypesManager() {
  const t = useTranslations('BusTypes');
  const page = useBusTypes();
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
          disabled={!page.canAdd}
          onClick={page.openCreate}
        >
          <Plus aria-hidden="true" />
          {t('addBusType')}
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
          caption={t('bus-typesTitle')}
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          search={{
            label: t('searchBusTypes'),
            placeholder: t('searchPlaceholder'),
          }}
          onRefresh={page.refresh}
          emptyState={
            <EmptyState
              icon={BusFront}
              title={t(page.list.hasFilters ? 'noResults' : 'noBusTypes')}
              description={t(
                page.list.hasFilters ? 'noResultsHint' : 'noBusTypesHint',
              )}
            />
          }
        />
      )}
      {page.editorOpen && page.query.data && (
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
