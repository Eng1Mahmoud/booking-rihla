'use client';
import { useTripsQuery } from '../hooks/useTripsQuery';
import { Link } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';

import { errorMessage } from '@/shared/lib/apiResult';

import { CalendarDays, Plus } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useId } from 'react';

import { useTripColumns } from '../hooks/useTripColumns';

import { TripEditor } from './TripEditor';
import { TripFilters } from './TripFilters';
export function TripsManager({ superAdmin }: { superAdmin: boolean }) {
  const { query, refresh: refreshQuery, options } = useTripsQuery();

  const locale = useLocale();

  const { columns, ...page } = useTripColumns({
    options,
    superAdmin,
  });
  function refresh() {
    page.clearNotice();
    void refreshQuery();
  }

  const t = page.t;
  const reasonId = useId();
  const reasonInvalid =
    Boolean(page.cancelConfirmation.error) &&
    (page.reason.trim().length < 5 || page.reason.trim().length > 500);
  return (
    <section className="min-w-0" aria-labelledby="trips-title">
      <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 id="trips-title" className="text-3xl font-bold tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('intro')}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="min-h-12">
            <Link href="/dashboard/trips/batch">{t('batch')}</Link>
          </Button>
          <Button
            ref={page.focus.fallbackRef}
            onClick={page.create}
            disabled={
              !query.data ||
              !options.routes.some((route) => route.isActive) ||
              !options.buses.some((bus) => bus.isActive)
            }
            className="min-h-12"
          >
            <Plus aria-hidden="true" />
            {t('add')}
          </Button>
        </div>
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
          columns={columns}
          data={query.data?.items ?? []}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-300 [&_td]:wrap-anywhere"
          isLoading={query.isPending}
          isFetching={query.isFetching}
          onRefresh={refresh}
          filters={
            <TripFilters options={options} disabled={query.isFetching} />
          }
          emptyState={
            <EmptyState
              icon={CalendarDays}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.editorOpen && (
        <TripEditor
          entry={page.editing}
          options={options}
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
          description={t('deleteHint')}
          pending={page.confirmation.pending}
          error={page.confirmation.error}
          onConfirm={page.confirmation.confirm}
          onCancel={page.closeConfirmation}
          onCloseAutoFocus={page.focus.restore}
        />
      )}{' '}
      {page.cancelling && (
        <ConfirmDialog
          open
          variant="destructive"
          title={t('cancel')}
          description={t('cancelHint')}
          confirmLabel={t('confirmCancel')}
          pending={page.cancelConfirmation.pending}
          error={reasonInvalid ? undefined : page.cancelConfirmation.error}
          onConfirm={page.cancelConfirmation.confirm}
          onCancel={page.closeCancellation}
          onCloseAutoFocus={page.focus.restore}
        >
          <div className="mt-4 grid gap-2 text-sm">
            <label htmlFor={reasonId}>{t('reason')}</label>
            <textarea
              id={reasonId}
              value={page.reason}
              onChange={(event) => page.setReason(event.target.value)}
              minLength={5}
              maxLength={500}
              disabled={page.cancelConfirmation.pending}
              className="min-h-28 rounded-md border bg-card p-3"
              aria-invalid={reasonInvalid}
              aria-describedby={reasonId + '-hint'}
            />
            <span
              id={reasonId + '-hint'}
              role={reasonInvalid ? 'alert' : undefined}
              className={
                reasonInvalid ? 'text-destructive' : 'text-muted-foreground'
              }
            >
              {t('reasonHint')}
            </span>
          </div>
        </ConfirmDialog>
      )}
    </section>
  );
}
