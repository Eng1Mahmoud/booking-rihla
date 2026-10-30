'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveBusTypeAction,
  getBusTypeAction,
} from '../actions/busType.actions';
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
  createBusTypeFormSchema,
  type BusTypeInput,
} from '../schemas/busTypeSchema';
import type { BusType } from '../types/busType';

export function BusTypeForm({ entry = null }: { entry?: BusType | null }) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/bus-types?' + urlParams.toString();

  const save = useMutation({
    retry: false,
    mutationFn: async (values: BusTypeInput) => {
      await invokeAction(() => saveBusTypeAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['fleet'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('BusTypes');
  const common = useTranslations('Common');
  const formMessages = useTranslations('Forms');
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'editBusType' : 'addBusType')}
      description={t('busTypeFormHint')}
      pending={pending}
    >
      <Form
        schema={createBusTypeFormSchema(formMessages)}
        defaultValues={{
          code: entry?.code ?? '',
          nameAr: entry?.nameAr ?? '',
          nameEn: entry?.nameEn ?? '',
        }}
        onSubmit={save.mutateAsync}
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
        <PageFormActions
          pending={pending}
          backHref={backHref}
          submitLabel={entry ? common('saveChanges') : t('addBusType')}
        />
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function BusTypeFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('BusTypes');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['fleet', locale, 'bus-types-form', id ?? 'new'],
    queryFn: () => invokeAction(() => getBusTypeAction(id ?? '')),
    enabled: Boolean(id),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (id && !query.data)
    return (
      <ContentPage
        title={t(id ? 'editBusType' : 'addBusType')}
        description={t('busTypeFormHint')}
        backHref={'/dashboard/bus-types?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return <BusTypeForm key={id ?? 'new'} entry={query.data} />;
}
