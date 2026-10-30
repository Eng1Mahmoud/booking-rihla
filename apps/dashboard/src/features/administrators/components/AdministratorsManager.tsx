'use client';
import { useUserColumns } from '@/features/users/hooks/useUserColumns';
import { Link } from '@/i18n/navigation';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { errorMessage } from '@/shared/lib/apiResult';
import { Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getAdministratorsAction } from '../actions/administrator.actions';
import { AdministratorFilters } from './AdministratorFilters';
import { AdministratorRoleEditor } from './AdministratorRoleEditor';
export function AdministratorsManager() {
  const { query } = useTableQuery({
    action: getAdministratorsAction,
    queryKey: 'administrators',
  });

  const locale = useLocale();

  const { columns, ...page } = useUserColumns({
    canChangeRole: true,
    administrator: true,
  });
  const t = useTranslations('Users');

  return (
    <section className="min-w-0">
      <h1
        ref={page.focus.fallbackRef}
        tabIndex={-1}
        className="text-3xl font-bold tracking-tight"
      >
        {t('administrators')}
      </h1>
      <p className="mt-2 mb-5 max-w-[65ch] text-muted-foreground">
        {t('administratorsIntro')}
      </p>
      <Link
        href="/dashboard/users"
        className="mb-5 inline-flex min-h-11 items-center text-primary underline underline-offset-4"
      >
        {t('promoteUser')}
      </Link>
      <p role="status" className="mb-4 text-primary">
        {page.notice}
      </p>
      <AdministratorFilters />
      {query.isError && (
        <ListError
          title={t('readFailed')}
          description={errorMessage(query.error, locale)}
          pending={query.isFetching}
          onRetry={() => {
            void query.refetch();
          }}
        />
      )}
      {(query.isPending || query.data) && (
        <DataTable
          columns={columns}
          data={query.data?.items ?? []}
          rowCount={query.data?.total}
          getRowId={(row) => row.id}
          caption={t('administrators')}
          tableClassName="min-w-320 [&_td]:wrap-anywhere"
          isLoading={query.isPending}
          isFetching={query.isFetching}
          onRefresh={() => {
            void query.refetch();
          }}
          emptyState={
            <EmptyState
              icon={Users}
              title={t('empty')}
              description={t('emptyHint')}
            />
          }
        />
      )}{' '}
      {page.target && (
        <ConfirmDialog
          open
          variant={page.target.isActive ? 'destructive' : 'default'}
          title={t(page.target.isActive ? 'suspend' : 'activate')}
          description={t(
            page.target.isActive ? 'suspendHint' : 'activateHint',
            { name: page.target.name },
          )}
          pending={page.confirmation.pending}
          error={page.confirmation.error}
          onConfirm={page.confirmation.confirm}
          onCancel={page.closeStatus}
          onCloseAutoFocus={page.focus.restore}
        />
      )}{' '}
      {page.editingRole && (
        <AdministratorRoleEditor
          entry={page.editingRole}
          pending={page.role.isPending}
          onSave={async (role) => {
            await page.role.mutateAsync(role);
          }}
          onClose={page.closeRole}
          onCloseAutoFocus={page.focus.restore}
        />
      )}
    </section>
  );
}
