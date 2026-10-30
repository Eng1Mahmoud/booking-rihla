'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveRouteAction,
  getRouteAction,
  getRouteStationsAction,
} from '../actions/route.actions';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import {
  createRouteFormSchema,
  type Route,
  type RouteInput,
} from '../schemas/routeSchema';
import { stationLabel, type RouteStation } from '../lib/routeColumns';
export function RouteForm({
  entry = null,
  stations,
}: {
  entry?: Route | null;
  stations: RouteStation[];
}) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/routes?' + urlParams.toString();

  const save = useMutation({
    retry: false,
    mutationFn: async (values: RouteInput) => {
      await invokeAction(() => saveRouteAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['routes'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const t = useTranslations('Routes');
  const formMessages = useTranslations('Forms');
  const common = useTranslations('Common');
  const locale = useLocale();
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'edit' : 'add')}
      description={t('formHint')}
      pending={pending}
    >
      <Form
        schema={createRouteFormSchema(formMessages)}
        defaultValues={{
          originStationId: entry?.originStationId ?? '',
          destinationStationId: entry?.destinationStationId ?? '',
          estimatedDurationMinutes: String(
            entry?.estimatedDurationMinutes ?? 120,
          ),
          isActive: entry?.isActive ?? true,
        }}
        onSubmit={save.mutateAsync}
      >
        {(form) => (
          <>
            <fieldset disabled={pending} className="grid gap-4">
              {(['originStationId', 'destinationStationId'] as const).map(
                (name) => (
                  <FormSelect
                    key={name}
                    name={name}
                    label={t(
                      name === 'originStationId' ? 'origin' : 'destination',
                    )}
                  >
                    <NativeSelectOption value="">
                      {t('chooseStation')}
                    </NativeSelectOption>
                    {stations.map((station) => (
                      <NativeSelectOption key={station.id} value={station.id}>
                        {stationLabel(station, locale)}
                      </NativeSelectOption>
                    ))}
                  </FormSelect>
                ),
              )}
              <FormInput
                name="estimatedDurationMinutes"
                type="number"
                min="1"
                max="10080"
                step="1"
                label={t('duration')}
              />
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  {...form.register('isActive')}
                  className="size-5 accent-primary"
                />
                {t('active')}
              </label>
            </fieldset>
            <PageFormActions
              pending={pending}
              backHref={backHref}
              submitLabel={common('saveChanges')}
            />
          </>
        )}
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function RouteFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Routes');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['routes', locale, 'routes-form', id ?? 'new'],
    queryFn: async () => {
      const [entry, stations] = await Promise.all([
        id ? invokeAction(() => getRouteAction(id)) : Promise.resolve(null),
        invokeAction(getRouteStationsAction),
      ]);
      return { entry, stations };
    },
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  if (!query.data)
    return (
      <ContentPage
        title={t(id ? 'edit' : 'add')}
        description={t('formHint')}
        backHref={'/dashboard/routes?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return (
    <RouteForm
      key={id ?? 'new'}
      entry={query.data.entry}
      stations={query.data.stations}
    />
  );
}
