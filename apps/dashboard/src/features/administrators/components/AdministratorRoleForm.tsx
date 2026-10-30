'use client';
import { getUserAction } from '@/features/users/actions/user.actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  setAdministratorRoleAction,
  getAdministratorAction,
} from '../actions/administrator.actions';
import { createAdministratorRoleFormSchema } from '../schemas/administratorSchema';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import type { ManagedUser } from '@/features/users/schemas/userSchema';
export function AdministratorRoleForm({
  entry,
  listPath,
}: {
  entry: ManagedUser;
  listPath: '/dashboard/users' | '/dashboard/administrators';
}) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = listPath + '?' + urlParams.toString();
  const save = useMutation({
    retry: false,
    mutationFn: async (role: ManagedUser['role']) => {
      await invokeAction(() =>
        setAdministratorRoleAction({ id: entry.id, role }),
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ['users'] }),
        client.invalidateQueries({ queryKey: ['administrators'] }),
      ]);
      router.push(backHref);
      router.refresh();
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Users');
  const formMessages = useTranslations('Forms');
  const states = useTranslations('States');
  return (
    <ContentPage
      backHref={backHref}
      title={t('changeRole')}
      description={t('roleHint', { name: entry.name })}
      pending={pending}
    >
      <Form
        schema={createAdministratorRoleFormSchema(formMessages)}
        defaultValues={{ role: entry.role }}
        onSubmit={(values) => save.mutateAsync(values.role)}
      >
        <fieldset disabled={pending}>
          <FormSelect name="role" label={t('role')}>
            {(['USER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'] as const).map(
              (role) => (
                <NativeSelectOption
                  key={role}
                  value={role}
                  disabled={
                    role !== 'USER' &&
                    (!entry.isActive || !entry.emailVerifiedAt)
                  }
                >
                  {states(role)}
                </NativeSelectOption>
              ),
            )}
          </FormSelect>
        </fieldset>
        <PageFormActions
          pending={pending}
          backHref={backHref}
          submitLabel={t('saveRole')}
        />
      </Form>
    </ContentPage>
  );
}

export function AdministratorRoleFormPage({
  id,
  listPath,
}: {
  id: string;
  listPath: '/dashboard/users' | '/dashboard/administrators';
}) {
  const locale = useLocale();
  const t = useTranslations('Users');
  const common = useTranslations('Common');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: [
      listPath === '/dashboard/users' ? 'users' : 'administrators',
      locale,
      'role-form',
      id,
    ],
    queryFn: () =>
      invokeAction(() =>
        (listPath === '/dashboard/users'
          ? getUserAction
          : getAdministratorAction)(id),
      ),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (!query.data)
    return (
      <ContentPage
        title={t('changeRole')}
        description={common('loading')}
        backHref={listPath + '?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return (
    <AdministratorRoleForm key={id} entry={query.data} listPath={listPath} />
  );
}
