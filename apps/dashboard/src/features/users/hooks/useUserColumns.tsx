'use client';
import {
  setAdministratorRoleAction,
  setAdministratorStatusAction,
} from '@/features/administrators/actions/administrator.actions';
import { formatReportTime } from '@/features/dashboard/lib/format';
import { RowActionMenu } from '@/shared/components/tables/RowActionMenu';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { invokeAction } from '@/shared/lib/apiResult';
import { type DataTableColumn } from '@/shared/lib/dataTable';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { setUserStatusAction } from '../actions/user.actions';
import { userRoles, type ManagedUser } from '../schemas/userSchema';
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

  const focus = useDialogFocus<HTMLHeadingElement>();
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [rolePick, setRolePick] = useState<{
    user: ManagedUser;
    role: ManagedUser['role'];
  } | null>(null);

  const [notice, setNotice] = useState('');

  async function refreshAccounts() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['users'] }),
      client.invalidateQueries({ queryKey: ['administrators'] }),
    ]);
  }
  const statusChange = useMutation({
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

  const roleChange = useMutation({
    retry: false,
    mutationFn: async () => {
      if (!rolePick) return;

      await invokeAction(() =>
        setAdministratorRoleAction({
          id: rolePick.user.id,
          role: rolePick.role,
        }),
      );
      await refreshAccounts();
      setRolePick(null);
      setNotice(t('updated'));
    },
  });

  const confirmation = useConfirmation(async () => {
    await statusChange.mutateAsync();
  });
  const roleConfirmation = useConfirmation(async () => {
    await roleChange.mutateAsync();
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
    (user: ManagedUser, role: ManagedUser['role']) => {
      focus.remember();
      roleConfirmation.reset();
      setNotice('');
      setRolePick({ user, role });
    },
    [focus.remember, roleConfirmation.reset],
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
                    icon: KeyRound,
                    items: userRoles.map((role) => ({
                      label: states(role),
                      onSelect: () => openRole(row.original, role),
                      disabled:
                        role === row.original.role ||
                        (role !== 'USER' &&
                          (!row.original.isActive ||
                            !row.original.emailVerifiedAt)),
                    })),
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
    notice,
    statusChange,
    confirmation,
    openStatus,
    closeStatus: () => {
      if (!confirmation.pending) setTarget(null);
    },
    rolePick,
    roleConfirmation,
    closeRole: () => {
      if (!roleConfirmation.pending) setRolePick(null);
    },
  };
}
