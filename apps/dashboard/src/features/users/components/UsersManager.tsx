'use client';
import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Users, ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { DataTable } from '@/shared/components/tables/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { ConfirmDialog } from '@/shared/components/dialogs/ConfirmDialog';
import { ListError } from '@/shared/components/feedback/ListError';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { formatReportTime } from '@/features/dashboard/lib/format';
import { AdministratorRoleEditor } from '@/features/administrators/components/AdministratorRoleEditor';
import type { ManagedUser, UserFilters } from '../schemas/userSchema';
import { useUsers } from '../hooks/useUsers';
export function UsersManager({ superAdmin }: { superAdmin: boolean }) {
  const page = useUsers(),
    locale = useLocale(),
    t = useTranslations('Users'),
    states = useTranslations('States');
  const columns = useMemo<DataTableColumn<ManagedUser>[]>(
    () => [
      { id: 'name', header: t('name'), cell: ({ row }) => row.original.name },
      {
        id: 'email',
        header: t('email'),
        cell: ({ row }) => <bdi>{row.original.email}</bdi>,
      },
      {
        id: 'phone',
        header: t('phone'),
        cell: ({ row }) => <bdi>{row.original.phone}</bdi>,
      },
      {
        id: 'role',
        header: t('role'),
        cell: ({ row }) => states(row.original.role),
      },
      {
        id: 'verified',
        header: t('verified'),
        cell: ({ row }) => t(row.original.emailVerifiedAt ? 'yes' : 'no'),
      },
      {
        id: 'status',
        header: t('status'),
        cell: ({ row }) => t(row.original.isActive ? 'active' : 'suspended'),
      },
      {
        id: 'created',
        header: t('created'),
        cell: ({ row }) => formatReportTime(row.original.createdAt, locale),
      },
      {
        id: 'actions',
        header: t('actions'),
        meta: { headerClassName: 'w-24 text-center' },
        cell: ({ row }) => (
          <RowActionMenu
            name={row.original.name}
            actions={[
              {
                label: t(row.original.isActive ? 'suspend' : 'activate'),
                icon: row.original.isActive ? UserRoundX : UserRoundCheck,
                destructive: row.original.isActive,
                onSelect: () => page.openStatus(row.original),
              },
              ...(superAdmin
                ? [
                    {
                      label: t('changeRole'),
                      icon: ShieldCheck,
                      onSelect: () => page.openRole(row.original),
                    },
                  ]
                : []),
            ]}
          />
        ),
      },
    ],
    [t, states, locale, page.openStatus, page.openRole, superAdmin],
  );
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
        key={JSON.stringify(page.list.filters)}
        className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          page.list.resetFilters(
            Object.fromEntries(
              Object.keys(page.list.filters).map((key) => [
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
            defaultValue={page.list.filters.email}
            className="min-h-11 bg-card"
          />
        </label>
        <label className="grid min-w-0 flex-1 basis-44 gap-2 text-sm">
          <span>{t('phone')}</span>
          <Input
            name="phone"
            type="tel"
            dir="ltr"
            defaultValue={page.list.filters.phone}
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
            defaultValue={page.list.filters.isActive}
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
          onClick={() => page.list.resetFilters()}
        >
          {t('clear')}
        </Button>
      </form>
      {page.query.isError && (
        <ListError
          title={t('readFailed')}
          description={t('readFailedHint')}
          pending={page.query.isFetching}
          onRetry={() => {
            void page.query.refetch();
          }}
        />
      )}
      {(page.query.isPending || page.query.data) && (
        <DataTable
          state={page.list}
          columns={columns}
          data={page.query.data?.items ?? []}
          rowCount={page.query.data?.total}
          getRowId={(row) => row.id}
          caption={t('title')}
          tableClassName="min-w-320 [&_td]:wrap-anywhere"
          isLoading={page.query.isPending}
          isFetching={page.query.isFetching}
          onRefresh={() => {
            void page.query.refetch();
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
