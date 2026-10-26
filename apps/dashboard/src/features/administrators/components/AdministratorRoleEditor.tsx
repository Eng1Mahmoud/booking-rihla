'use client';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import type { ManagedUser } from '@/features/users/schemas/userSchema';
const schema = z.object({ role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']) });
export function AdministratorRoleEditor({
  entry,
  pending,
  onSave,
  onClose,
  onCloseAutoFocus,
}: {
  entry: ManagedUser;
  pending: boolean;
  onSave: (role: ManagedUser['role']) => Promise<void>;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('Users'),
    states = useTranslations('States');
  return (
    <FormDialog
      title={t('changeRole')}
      description={t('roleHint', { name: entry.name })}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={schema}
        defaultValues={{ role: entry.role }}
        onSubmit={(values) => onSave(values.role)}
      >
        <fieldset disabled={pending}>
          <FormSelect name="role" label={t('role')}>
            {(['USER', 'ADMIN', 'SUPER_ADMIN'] as const).map((role) => (
              <NativeSelectOption
                key={role}
                value={role}
                disabled={
                  role !== 'USER' && (!entry.isActive || !entry.emailVerifiedAt)
                }
              >
                {states(role)}
              </NativeSelectOption>
            ))}
          </FormSelect>
        </fieldset>
        <FormDialogActions
          pending={pending}
          onCancel={onClose}
          submitLabel={t('saveRole')}
        />
      </Form>
    </FormDialog>
  );
}
