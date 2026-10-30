'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveBusAction,
  getBusAction,
  getBusOptionsAction,
} from '../actions/bus.actions';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { FieldError } from '@/shared/components/ui/field';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import {
  createBusFormSchema,
  type BusInput,
  type BusFormValues,
} from '../schemas/busSchema';
import { busFormValues } from '../lib/busFormValues';
import type { Bus, BusOptions } from '../types/bus';
export function BusForm({
  entry = null,
  options,
}: {
  entry?: Bus | null;
  options: BusOptions;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/buses?' + urlParams.toString();

  const save = useMutation({
    retry: false,
    mutationFn: async (values: BusInput) => {
      await invokeAction(() => saveBusAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['fleet'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Buses');
  const formMessages = useTranslations('Forms');
  const common = useTranslations('Common');
  const locale = useLocale();
  const id = useId();
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'editBus' : 'addBus')}
      description={t('busFormHint')}
      pending={pending}
    >
      <Form
        schema={createBusFormSchema(formMessages)}
        defaultValues={busFormValues(entry)}
        onSubmit={save.mutateAsync}
      >
        {(form) => (
          <>
            <fieldset disabled={pending} className="grid min-w-0 gap-4">
              <FormInput<BusFormValues>
                name="plateNumber"
                label={t('plateNumber')}
                maxLength={32}
                autoFocus
                autoComplete="off"
                dir="auto"
              />
              <FormInput<BusFormValues>
                name="seatCount"
                label={t('seatCount')}
                description={t('capacityHint')}
                type="number"
                min={1}
                max={100}
                step={1}
                inputMode="numeric"
              />
              <FormSelect<BusFormValues>
                name="seatLayout"
                label={t('seatLayout')}
                description={t('layoutHint')}
              >
                <NativeSelectOption value="">
                  {t('numberedLayout')}
                </NativeSelectOption>
                <NativeSelectOption value="STANDARD_2_2">
                  {t('standardLayout')}
                </NativeSelectOption>
              </FormSelect>
              <FormSelect<BusFormValues> name="busTypeId" label={t('busType')}>
                <NativeSelectOption value="">{t('noType')}</NativeSelectOption>
                {entry?.busTypeId &&
                  !options.busTypes.some(
                    (item) => item.id === entry.busTypeId,
                  ) && (
                    <NativeSelectOption value={entry.busTypeId}>
                      {t('missingType')}
                    </NativeSelectOption>
                  )}
                {options.busTypes.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item[locale === 'ar' ? 'nameAr' : 'nameEn']}
                  </NativeSelectOption>
                ))}
              </FormSelect>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  {...form.register('isActive')}
                  className="size-4 shrink-0 accent-primary"
                />
                {t('active')}
              </label>
              <fieldset
                aria-describedby={
                  id +
                  '-amenities-hint' +
                  (form.formState.errors.amenityIds
                    ? ' ' + id + '-amenities-error'
                    : '')
                }
                className="min-w-0"
              >
                <legend className="mb-2 text-sm font-medium">
                  {t('amenities')}
                </legend>
                <p
                  id={id + '-amenities-hint'}
                  className="mb-2 text-sm text-muted-foreground"
                >
                  {t('amenitiesHint')}
                </p>
                {options.amenities.length ? (
                  <div className="max-h-48 overflow-y-auto rounded-md border p-3">
                    {options.amenities.map((item) => (
                      <label
                        key={item.id}
                        className="flex min-h-11 items-center gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          value={item.id}
                          {...form.register('amenityIds')}
                          className="size-4 shrink-0 accent-primary"
                        />
                        <span className="min-w-0 break-words">
                          {item[locale === 'ar' ? 'nameAr' : 'nameEn']}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('noAmenities')}
                  </p>
                )}
                <FieldError
                  id={id + '-amenities-error'}
                  errors={[form.formState.errors.amenityIds]}
                />
              </fieldset>
              <p className="text-sm text-muted-foreground">
                {t('editSafeguards')}
              </p>
            </fieldset>
            <PageFormActions
              pending={pending}
              backHref={backHref}
              submitLabel={entry ? common('saveChanges') : t('addBus')}
            />
          </>
        )}
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function BusFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Buses');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['fleet', locale, 'buses-form', id ?? 'new'],
    queryFn: async () => {
      const [entry, options] = await Promise.all([
        id ? invokeAction(() => getBusAction(id)) : Promise.resolve(null),
        invokeAction(getBusOptionsAction),
      ]);
      return { entry, options };
    },
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (!query.data)
    return (
      <ContentPage
        title={t(id ? 'editBus' : 'addBus')}
        description={t('busFormHint')}
        backHref={'/dashboard/buses?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return (
    <BusForm
      key={id ?? 'new'}
      entry={query.data.entry}
      options={query.data.options}
    />
  );
}
