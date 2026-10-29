'use client';
import {
  setAdministratorRoleAction,
  setAdministratorStatusAction,
} from '@/features/administrators/actions/administrator.actions';
import { formatReportTime } from '@/features/dashboard/lib/format';
import { useRouter } from '@/i18n/navigation';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { setUserStatusAction } from '../actions/user.actions';
import { type ManagedUser } from '../schemas/userSchema';
export function useUserColumns({
  canChangeRole,
  administrator = false,
}: {
  canChangeRole: boolean;
  administrator?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations('Users');
  const states = useTranslations('States');
  const client = useQueryClient();
  const router = useRouter();
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [editingRole, setEditingRole] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState('');

  async function refreshAccounts() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['administrators'] }),
    ]);
  }
  const status = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!target) return;

      await invokeAction(() =>
        (administrator ? setAdministratorStatusAction : setUserStatusAction)({
          id: target.id,
          isActive: !target.isActive,
        }),
      );
      await refreshAccounts();
      setTarget(null);
      setNotice(t('updated'));
    },
  });
  const role = useMutation({
    retry: false,
    mutationFn: async (role: ManagedUser['role']) => {
      if (!editingRole) return;

      await invokeAction(() =>
        setAdministratorRoleAction({ id: editingRole.id, role }),
      );
      await refreshAccounts();
      setEditingRole(null);
      setNotice(t('updated'));
      router.refresh();
    },
  });
  const confirmation = useConfirmation(async () => {
    await status.mutateAsync();
  });
  const openStatus = useCallback(
    (user: ManagedUser) => {
      focus.remember();
      confirmation.reset();
      setNotice('');
      setTarget(user);
    },
    [focus.remember, confirmation.reset],
  );
  const openRole = useCallback(
    (user: ManagedUser) => {
      focus.remember();
      setNotice('');
      setEditingRole(user);
    },
    [focus.remember],
  );
  const columns: DataTableColumn<ManagedUser>[] = [
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
              onSelect: () => openStatus(row.original),
            },
            ...(canChangeRole
              ? [
                  {
                    label: t('changeRole'),
                    icon: ShieldCheck,
                    onSelect: () => openRole(row.original),
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ];
  return {
    columns,
    focus,
    target,
    editingRole,
    notice,
    status,
    role,
    confirmation,
    openStatus,
    openRole,
    closeStatus: () => {
      if (!confirmation.pending) setTarget(null);
    },
    closeRole: () => {
      if (!role.isPending) setEditingRole(null);
    },
  };
}
