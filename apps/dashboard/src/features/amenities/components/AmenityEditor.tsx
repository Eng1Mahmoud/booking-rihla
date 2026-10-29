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
  amenityInputSchema,
  type AmenityInput,
} from '../schemas/amenitySchema';
import type { Amenity } from '../types/amenity';

export function AmenityEditor({
  entry,
  pending,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  entry: Amenity | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: AmenityInput) => Promise<void>;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('Amenities');
  const common = useTranslations('Common');
  return (
    <FormDialog
      title={t(entry ? 'editAmenity' : 'addAmenity')}
      description={t('amenityFormHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={amenityInputSchema}
        defaultValues={{
          code: entry?.code ?? '',
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={onSave}
      >
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <NameFields />
          <FormInput<AmenityInput>
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
          submitLabel={entry ? common('saveChanges') : t('addAmenity')}
        />
      </Form>
    </FormDialog>
  );
}
