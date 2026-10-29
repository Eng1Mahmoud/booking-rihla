'use client';
import { AdministratorRoleEditor } from '@/features/administrators/components/AdministratorRoleEditor';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ListError } from '@/shared/components/feedback/ListError';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { invokeAction, errorMessage } from '@/shared/lib/apiResult';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { getUsersAction } from '../actions/user.actions';
import { useUserColumns } from '../hooks/useUserColumns';
import { type UserFilters } from '../schemas/userSchema';
export function UsersManager({ superAdmin }: { superAdmin: boolean }) {
  const locale = useLocale();

  const list = useDataTableState<UserFilters>({
    initialFilters: { email: '', phone: '', isActive: '' },
  });
  const query = useQuery({
    queryKey: ['users', locale, list.params],
    queryFn: () =>
      invokeAction(() =>
        getUsersAction({
          limit: list.params.limit,
          offset: list.params.offset,
          ...list.filters,
        }),
      ),
  });
  const { columns, ...page } = useUserColumns({
    canChangeRole: superAdmin,
  });

  const t = useTranslations('Users');

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
      <form
        key={JSON.stringify(list.filters)}
        className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          list.resetFilters(
            Object.fromEntries(
              Object.keys(list.filters).map((key) => [
                key,
                String(data.get(key) ?? '').trim(),
              ]),
            ) as UserFilters,
          );
        }}
      >
        <label className="grid min-w-0 flex-1 basis-56 gap-2 text-sm">
          <span>{t('email')}</span>
          <Input
            name="email"
            type="email"
            dir="ltr"
            defaultValue={list.filters.email}
            className="min-h-11 bg-card"
          />
        </label>
        <label className="grid min-w-0 flex-1 basis-44 gap-2 text-sm">
          <span>{t('phone')}</span>
          <Input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={list.filters.phone}
            className={
              locale === 'ar'
                ? 'min-h-11 bg-card text-right'
                : 'min-h-11 bg-card'
            }
          />
        </label>
        <label className="grid gap-2 text-sm">
          <span>{t('status')}</span>
          <NativeSelect
            name="isActive"
            defaultValue={list.filters.isActive}
            className="min-h-11"
          >
            <NativeSelectOption value="">{t('all')}</NativeSelectOption>
            <NativeSelectOption value="true">{t('active')}</NativeSelectOption>
            <NativeSelectOption value="false">
              {t('suspended')}
            </NativeSelectOption>
          </NativeSelect>
        </label>
        <Button type="submit" className="min-h-11">
          {t('apply')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={() => list.resetFilters()}
        >
          {t('clear')}
        </Button>
      </form>
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
          state={list}
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
