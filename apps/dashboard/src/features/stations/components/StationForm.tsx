'use client';
import { getCityOptionsAction } from '@/features/cities/actions/city.actions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveStationAction,
  getStationAction,
} from '../actions/station.actions';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import {
  createStationFormSchema,
  type StationInput,
} from '../schemas/stationSchema';
import type { Station } from '../types/station';
import { Field, FieldError, FieldLabel } from '@/shared/components/ui/field';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { City } from '@/features/cities/types/city';

export function StationForm({
  entry = null,
  cities,
}: {
  entry?: Station | null;
  cities: City[];
}) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/stations?' + urlParams.toString();
  const cityId = urlParams.get('filter.cityId') ?? '';
  const save = useMutation({
    retry: false,
    mutationFn: async (values: StationInput) => {
      await invokeAction(() => saveStationAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['locations'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Stations');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  const locale = useLocale();
  const selectId = useId();
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'editStation' : 'addStation')}
      description={t('stationFormHint')}
      pending={pending}
    >
      <Form
        schema={createStationFormSchema(formMessages)}
        defaultValues={{
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
          cityId: entry?.cityId ?? cityId,
        }}
        onSubmit={save.mutateAsync}
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
            <PageFormActions
              pending={pending}
              backHref={backHref}
              submitLabel={entry ? common('saveChanges') : t('addStation')}
            />
          </>
        )}
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function StationFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Stations');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['locations', locale, 'stations-form', id ?? 'new'],
    queryFn: async () => {
      const [entry, cities] = await Promise.all([
        id ? invokeAction(() => getStationAction(id)) : Promise.resolve(null),
        invokeAction(getCityOptionsAction),
      ]);
      return { entry, cities };
    },
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (!query.data)
    return (
      <ContentPage
        title={t(id ? 'editStation' : 'addStation')}
        description={t('stationFormHint')}
        backHref={'/dashboard/stations?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return (
    <StationForm
      key={id ?? 'new'}
      entry={query.data.entry}
      cities={query.data.cities}
    />
  );
}
