'use client';
import { useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import { createCityFormSchema, type CityInput } from '../schemas/citySchema';
import type { City } from '../types/city';

export function CityEditor({
  entry,
  pending,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  entry: City | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: CityInput) => Promise<void>;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('Cities');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  return (
    <FormDialog
      title={t(entry ? 'editCity' : 'addCity')}
      description={t('cityFormHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={createCityFormSchema(formMessages)}
        defaultValues={{
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={onSave}
      >
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <NameFields />
        </fieldset>
        <FormDialogActions
          pending={pending}
          onCancel={onClose}
          submitLabel={entry ? common('saveChanges') : t('addCity')}
        />
      </Form>
    </FormDialog>
  );
}
