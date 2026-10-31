'use client';
import { useUserColumns } from '@/features/users/hooks/useUserColumns';
import { UserFilters } from './UserFilters';
import { useTableQuery } from '@/shared/hooks/useTableQuery';
import { getUsersAction } from '../actions/user.actions';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { errorMessage } from '@/shared/lib/apiResult';
import { Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

export function UsersManager({ superAdmin }: { superAdmin: boolean }) {
  const { query } = useTableQuery({
    action: getUsersAction,
    queryKey: 'users',
  });

  const locale = useLocale();

  const { columns, ...page } = useUserColumns({
    canChangeRole: superAdmin,
  });

  const t = useTranslations('Users');
  const states = useTranslations('States');

  return (
    <section className="min-w-0">
      <h1
        ref={page.focus.fallbackRef}
        tabIndex={-1}
        className="text-3xl font-bold tracking-tight"
      >
        {t('title')}
      </h1>
      <p className="mt-2 mb-5 max-w-[65ch] text-muted-foreground">
        {t('intro')}
      </p>
      <p role="status" className="mb-4 text-primary">
        {page.notice}
      </p>
      <UserFilters />
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
          caption={t('title')}
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
      {page.rolePick && (
        <ConfirmDialog
          open
          title={t('changeRole')}
          description={t('roleConfirm', {
            name: page.rolePick.user.name,
            role: states(page.rolePick.role),
          })}
          pending={page.roleConfirmation.pending}
          error={page.roleConfirmation.error}
          confirmLabel={t('saveRole')}
          onConfirm={page.roleConfirmation.confirm}
          onCancel={page.closeRole}
          onCloseAutoFocus={page.focus.restore}
        />
      )}{' '}
    </section>
  );
}
