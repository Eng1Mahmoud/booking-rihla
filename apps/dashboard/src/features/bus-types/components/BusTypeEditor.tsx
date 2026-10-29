'use client';
import { useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import {
  createBusTypeFormSchema,
  type BusTypeInput,
} from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export function BusTypeEditor({
  entry,
  pending,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  entry: BusType | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: BusTypeInput) => Promise<void>;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('BusTypes');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  return (
    <FormDialog
      title={t(entry ? 'editBusType' : 'addBusType')}
      description={t('busTypeFormHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={createBusTypeFormSchema(formMessages)}
        defaultValues={{
          code: entry?.code ?? '',
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={onSave}
      >
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <NameFields />
          <FormInput<BusTypeInput>
            name="code"
            label={t('code')}
            description={t('codeHint')}
            dir="ltr"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
          />
        </fieldset>
        <FormDialogActions
          pending={pending}
          onCancel={onClose}
          submitLabel={entry ? common('saveChanges') : t('addBusType')}
        />
      </Form>
    </FormDialog>
  );
}
