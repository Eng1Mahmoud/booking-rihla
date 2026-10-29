'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import { TripTimingFields } from './TripTimingFields';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import {
  tripFormSchema,
  type Trip,
  type TripInput,
} from '../schemas/tripSchema';
import { tripLocalTime } from '../lib/tripTime';
import type { TripOptions } from '../types/trip';
export function TripEditor({
  entry,
  options,
  pending,
  onSave,
  onClose,
  onCloseAutoFocus,
}: {
  entry: Trip | null;
  options: TripOptions;
  pending: boolean;
  onSave: (values: TripInput) => Promise<unknown>;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const departure = entry
    ? tripLocalTime(entry.departureAt).split('T')
    : ['', '09:00'];
  const duration = entry
    ? String(
        (Date.parse(entry.arrivalAt) - Date.parse(entry.departureAt)) / 60000,
      )
    : '120';
  const t = useTranslations('Trips');
  const common = useTranslations('Common');
  const locale = useLocale();
  return (
    <FormDialog
      title={t(entry ? 'edit' : 'add')}
      description={t('timeHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={tripFormSchema}
        defaultValues={{
          routeId: entry?.routeId ?? '',
          busId: entry?.busId ?? '',
          departureDate: departure[0],
          departureTime: departure[1],
          durationMinutes: duration,
          pricePiastres: ((entry?.pricePiastres ?? 0) / 100).toFixed(2),
          status: entry?.status ?? 'SCHEDULED',
        }}
        onSubmit={async (values) => {
          await onSave(values);
        }}
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
        <FormDialogActions
          pending={pending}
          onCancel={onClose}
          submitLabel={common('saveChanges')}
        />
      </Form>
    </FormDialog>
  );
}
