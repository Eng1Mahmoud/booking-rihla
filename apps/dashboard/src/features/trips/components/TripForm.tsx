'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { invokeAction } from '@/shared/lib/apiResult';
import {
  saveTripAction,
  getTripAction,
  getTripOptionsAction,
} from '../actions/trip.actions';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import { TripTimingFields } from './TripTimingFields';
import {
  ContentPage,
  PageFormActions,
  PageQueryState,
} from '@/shared/components/layout/ContentPage';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import {
  createTripFormSchema,
  type Trip,
  type TripInput,
} from '../schemas/tripSchema';
import { tripLocalTime } from '../lib/tripTime';
import type { TripOptions } from '../types/trip';
export function TripForm({
  entry = null,
  options,
}: {
  entry?: Trip | null;
  options: TripOptions;
}) {
  const client = useQueryClient();
  const router = useRouter();
  const urlParams = useSearchParams();
  const backHref = '/dashboard/trips?' + urlParams.toString();

  const save = useMutation({
    retry: false,
    mutationFn: async (values: TripInput) => {
      await invokeAction(() => saveTripAction({ ...values, id: entry?.id }));
      await client.invalidateQueries({ queryKey: ['trips'] });
      router.push(backHref);
    },
  });
  const pending = save.isPending;
  const departure = entry
    ? tripLocalTime(entry.departureAt).split('T')
    : ['', '09:00'];
  const duration = entry
    ? String(
        (Date.parse(entry.arrivalAt) - Date.parse(entry.departureAt)) / 60000,
      )
    : '120';
  const t = useTranslations('Trips');
  const formMessages = useTranslations('Forms');
  const common = useTranslations('Common');
  const locale = useLocale();
  if (
    entry &&
    (entry.status === 'CANCELLED' ||
      Date.parse(entry.departureAt) <= Date.now())
  )
    return (
      <ContentPage
        title={t('edit')}
        description={t('timeHint')}
        backHref={backHref}
      >
        <p role="status" className="text-muted-foreground">
          {t('closed')}
        </p>
      </ContentPage>
    );
  return (
    <ContentPage
      backHref={backHref}
      title={t(entry ? 'edit' : 'add')}
      description={t('timeHint')}
      pending={pending}
    >
      <Form
        schema={createTripFormSchema(formMessages)}
        defaultValues={{
          routeId: entry?.routeId ?? '',
          busId: entry?.busId ?? '',
          departureDate: departure[0],
          departureTime: departure[1],
          durationMinutes: duration,
          pricePiastres: ((entry?.pricePiastres ?? 0) / 100).toFixed(2),
          status: entry?.status ?? 'SCHEDULED',
        }}
        onSubmit={save.mutateAsync}
      >
        <fieldset disabled={pending} className="grid gap-4">
          <FormSelect name="routeId" label={t('route')}>
            <NativeSelectOption value="">{t('chooseRoute')}</NativeSelectOption>
            {options.routes.map((route) => (
              <NativeSelectOption
                key={route.id}
                value={route.id}
                disabled={!route.isActive}
              >
                {routeLabel(route, options.stations, locale)}
              </NativeSelectOption>
            ))}
          </FormSelect>
          <FormSelect name="busId" label={t('bus')}>
            <NativeSelectOption value="">{t('chooseBus')}</NativeSelectOption>
            {options.buses.map((bus) => (
              <NativeSelectOption
                key={bus.id}
                value={bus.id}
                disabled={!bus.isActive}
              >
                {bus.plateNumber}
              </NativeSelectOption>
            ))}
          </FormSelect>
          <TripTimingFields />
          <FormInput
            name="pricePiastres"
            inputMode="decimal"
            dir="ltr"
            label={t('price')}
          />
        </fieldset>
        <PageFormActions
          pending={pending}
          backHref={backHref}
          submitLabel={common('saveChanges')}
        />
      </Form>
    </ContentPage>
  );
}

// Mount the form after its initial read; background events must not overwrite edits.
export function TripFormPage({ id }: { id?: string }) {
  const locale = useLocale();
  const t = useTranslations('Trips');
  const urlParams = useSearchParams();
  const query = useQuery({
    queryKey: ['trips', locale, 'trips-form', id ?? 'new'],
    queryFn: async () => {
      const [entry, options] = await Promise.all([
        id ? invokeAction(() => getTripAction(id)) : Promise.resolve(null),
        invokeAction(getTripOptionsAction),
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
        title={t(id ? 'edit' : 'add')}
        description={t('timeHint')}
        backHref={'/dashboard/trips?' + urlParams.toString()}
      >
        <PageQueryState query={query} />
      </ContentPage>
    );
  return (
    <TripForm
      key={id ?? 'new'}
      entry={query.data.entry}
      options={query.data.options}
    />
  );
}
