'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveAmenityAction,
  getAmenityAction,
} from '../actions/amenity.actions';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { NameFields } from '@/shared/components/forms/NameFields';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import {
  createAmenityFormSchema,
  type AmenityInput,
} from '../schemas/amenitySchema';
import type { Amenity } from '../types/amenity';

export function AmenityForm({ entry = null }: { entry?: Amenity | null }) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/amenities?' + urlParams.toString();

  const save = useMutation({
    retry: false,
    mutationFn: async (values: AmenityInput) => {
      await invokeAction(() => saveAmenityAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['fleet'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Amenities');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'editAmenity' : 'addAmenity')}
      description={t('amenityFormHint')}
      pending={pending}
    >
      <Form
        schema={createAmenityFormSchema(formMessages)}
        defaultValues={{
          code: entry?.code ?? '',
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={save.mutateAsync}
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
        <PageFormActions
          pending={pending}
          backHref={backHref}
          submitLabel={entry ? common('saveChanges') : t('addAmenity')}
        />
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function AmenityFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Amenities');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['fleet', locale, 'amenities-form', id ?? 'new'],
    queryFn: () => invokeAction(() => getAmenityAction(id ?? '')),
    enabled: Boolean(id),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (id && !query.data)
    return (
      <ContentPage
        title={t(id ? 'editAmenity' : 'addAmenity')}
        description={t('amenityFormHint')}
        backHref={'/dashboard/amenities?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return <AmenityForm key={id ?? 'new'} entry={query.data} />;
}
