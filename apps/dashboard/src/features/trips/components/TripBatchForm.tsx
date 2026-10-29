'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Temporal } from 'temporal-polyfill';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import { Form } from '@/shared/components/forms/Form';
import { DatePickr, TimePicker } from '@/shared/components/forms/DatePickr';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormCheckboxGroup } from '@/shared/components/forms/FormCheckboxGroup';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import { createBatchFormSchema, type BatchInput } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';

export function TripBatchForm({
  options,
  pending,
  onPreview,
  onChange,
}: {
  options: TripOptions;
  pending: boolean;
  onPreview: (input: BatchInput) => Promise<unknown>;
  onChange: () => void;
}) {
  const t = useTranslations('Trips');
  const formMessages = useTranslations('Forms');
  const locale = useLocale();
  const tomorrow = Temporal.Now.plainDateISO('Africa/Cairo')
    .add({ days: 1 })
    .toString();

  // Editing any field invalidates the previous preview before creation.
  return (
    <div onChangeCapture={onChange}>
      <Form
        schema={createBatchFormSchema(formMessages)}
        defaultValues={{
          routeId: '',
          busId: '',
          startDate: tomorrow,
          endDate: tomorrow,
          weekdays: ['1', '2', '3', '4', '5', '6', '7'],
          departureTime: '09:00',
          durationMinutes: '120',
          pricePiastres: '0.00',
        }}
        onSubmit={async (input) => {
          await onPreview(input);
        }}
        className="rounded-2xl border bg-card p-5 sm:p-7"
      >
        <fieldset
          disabled={pending}
          className="grid min-w-0 gap-5 sm:grid-cols-2"
        >
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
          <DatePickr name="startDate" label={t('startDate')} />
          <DatePickr name="endDate" label={t('endDate')} />
          <TimePicker name="departureTime" label={t('departureTime')} />
          <FormInput
            name="durationMinutes"
            type="number"
            min="1"
            max="10080"
            step="1"
            label={t('duration')}
          />
          <FormInput
            name="pricePiastres"
            inputMode="decimal"
            dir="ltr"
            label={t('price')}
          />
          <FormCheckboxGroup
            name="weekdays"
            label={t('weekdays')}
            options={[1, 2, 3, 4, 5, 6, 7].map((day) => ({
              value: String(day),
              label: t('day' + day),
            }))}
            className="sm:col-span-2"
          />
        </fieldset>
        <p className="text-sm text-muted-foreground">{t('timeHint')}</p>
        <SubmitButton disabled={pending}>{t('preview')}</SubmitButton>
      </Form>
    </div>
  );
}
