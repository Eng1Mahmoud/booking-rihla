'use client';
import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { useDataTableState } from '@/shared/hooks/useDataTableState';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import { useConfirmation } from '@/shared/hooks/useConfirmation';
import { useActionErrors } from '@/shared/hooks/useActionErrors';
import { invokeAction } from '@/shared/lib/apiResult';
import { getUsersAction, setUserStatusAction } from '../actions/user.actions';
import { setAdministratorRoleAction } from '@/features/administrators/actions/administrator.actions';
import type { ManagedUser, UserFilters } from '../schemas/userSchema';
export function useUsers() {
  const locale = useLocale();
  const t = useTranslations('Users');
  const client = useQueryClient();
  const router = useRouter();
  const list = useDataTableState<UserFilters>({
    initialFilters: { email: '', phone: '', isActive: '' },
  });
  const focus = useDialogFocus<HTMLHeadingElement>();
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [editingRole, setEditingRole] = useState<ManagedUser | null>(null);
  const [notice, setNotice] = useState('');
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
  const actionError = useActionErrors(query.error, {
    LAST_SUPER_ADMIN: t('lastSuper'),
    ACCOUNT_NOT_READY: t('notReady'),
    ADMINISTRATOR_NOT_FOUND: t('notFound'),
    USER_NOT_FOUND: t('notFound'),
  });
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
      try {
        await invokeAction(() =>
          setUserStatusAction({ id: target.id, isActive: !target.isActive }),
        );
        await refreshAccounts();
        setTarget(null);
        setNotice(t('updated'));
      } catch (error) {
        throw actionError(error);
      }
    },
  });
  const role = useMutation({
    retry: false,
    mutationFn: async (role: ManagedUser['role']) => {
      if (!editingRole) return;
      try {
        await invokeAction(() =>
          setAdministratorRoleAction({ id: editingRole.id, role }),
        );
        await refreshAccounts();
        setEditingRole(null);
        setNotice(t('updated'));
        router.refresh();
      } catch (error) {
        throw actionError(error);
      }
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
  return {
    list,
    focus,
    query,
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
