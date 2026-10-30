'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import { saveCityAction, getCityAction } from '../actions/city.actions';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { createCityFormSchema, type CityInput } from '../schemas/citySchema';
import type { City } from '../types/city';

export function CityForm({ entry = null }: { entry?: City | null }) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/cities?' + urlParams.toString();
  const save = useMutation({
    retry: false,
    mutationFn: async (values: CityInput) => {
      await invokeAction(() => saveCityAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['locations'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Cities');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  return (
    <ContentPage
      title={t(entry ? 'editCity' : 'addCity')}
      description={t('cityFormHint')}
      pending={pending}
      backHref={backHref}
    >
      <Form
        schema={createCityFormSchema(formMessages)}
        defaultValues={{
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={save.mutateAsync}
      >
        <fieldset disabled={pending} className="grid min-w-0 gap-4">
          <NameFields />
        </fieldset>
        <PageFormActions
          pending={pending}
          backHref={backHref}
          submitLabel={entry ? common('saveChanges') : t('addCity')}
        />
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function CityFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Cities');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['locations', locale, 'cities-form', id ?? 'new'],
    queryFn: () => invokeAction(() => getCityAction(id ?? '')),
    enabled: Boolean(id),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (id && !query.data)
    return (
      <ContentPage
        title={t(id ? 'editCity' : 'addCity')}
        description={t('cityFormHint')}
        backHref={'/dashboard/cities?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return <CityForm key={id ?? 'new'} entry={query.data} />;
}
