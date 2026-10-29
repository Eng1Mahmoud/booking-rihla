'use client';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import {
  stationInputSchema,
  type StationInput,
} from '../schemas/stationSchema';
import type { Station } from '../types/station';
import { Field, FieldError, FieldLabel } from '@/shared/components/ui/field';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { City } from '@/features/cities/types/city';

export function StationEditor({
  entry,
  cities,
  cityId,
  pending,
  onClose,
  onSave,
  onCloseAutoFocus,
}: {
  entry: Station | null;
  cities: City[];
  cityId: string;
  pending: boolean;
  onClose: () => void;
  onSave: (values: StationInput) => Promise<void>;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('Stations');
  const common = useTranslations('Common');
  const locale = useLocale();
  const selectId = useId();
  return (
    <FormDialog
      title={t(entry ? 'editStation' : 'addStation')}
      description={t('stationFormHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={stationInputSchema}
        serverErrorFields={{ CITY_NOT_FOUND: ['cityId'] }}
        defaultValues={{
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
          cityId: entry?.cityId ?? cityId,
        }}
        onSubmit={onSave}
      >
        {(form) => (
          <>
            <fieldset disabled={pending} className="grid min-w-0 gap-4">
              <NameFields />
              <Field data-invalid={!!form.formState.errors.cityId}>
                <FieldLabel htmlFor={selectId}>{common('city')}</FieldLabel>
                <NativeSelect
                  {...form.register('cityId')}
                  id={selectId}
                  aria-invalid={!!form.formState.errors.cityId}
                  aria-describedby={
                    form.formState.errors.cityId
                      ? selectId + '-error'
                      : undefined
                  }
                  className="h-12 bg-card text-base"
                >
                  <NativeSelectOption value="">
                    {t('chooseCity')}
                  </NativeSelectOption>
                  {cities.map((city) => (
                    <NativeSelectOption key={city.id} value={city.id}>
                      {locale === 'ar' ? city.nameAr : city.nameEn}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError
                  id={selectId + '-error'}
                  errors={[form.formState.errors.cityId]}
                />
              </Field>
            </fieldset>
            <FormDialogActions
              pending={pending}
              onCancel={onClose}
              submitLabel={entry ? common('saveChanges') : t('addStation')}
            />
          </>
        )}
      </Form>
    </FormDialog>
  );
}
