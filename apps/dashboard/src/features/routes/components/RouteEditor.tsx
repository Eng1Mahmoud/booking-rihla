'use client';
import { useLocale, useTranslations } from 'next-intl';
import { Form } from '@/shared/components/forms/Form';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import {
  FormDialog,
  FormDialogActions,
} from '@/shared/components/dialogs/FormDialog';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import {
  routeFormSchema,
  type Route,
  type RouteInput,
} from '../schemas/routeSchema';
import { stationLabel, type RouteStation } from '../lib/routeColumns';
export function RouteEditor({
  entry,
  stations,
  pending,
  onSave,
  onClose,
  onCloseAutoFocus,
}: {
  entry: Route | null;
  stations: RouteStation[];
  pending: boolean;
  onSave: (values: RouteInput) => Promise<unknown>;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const t = useTranslations('Routes'),
    common = useTranslations('Common'),
    locale = useLocale();
  return (
    <FormDialog
      title={t(entry ? 'edit' : 'add')}
      description={t('formHint')}
      pending={pending}
      onClose={onClose}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <Form
        schema={routeFormSchema}
        serverErrorFields={{
          ROUTE_EXISTS: ['originStationId', 'destinationStationId'],
          STATION_NOT_FOUND: ['originStationId', 'destinationStationId'],
        }}
        defaultValues={{
          originStationId: entry?.originStationId ?? '',
          destinationStationId: entry?.destinationStationId ?? '',
          estimatedDurationMinutes: String(
            entry?.estimatedDurationMinutes ?? 120,
          ),
          isActive: entry?.isActive ?? true,
        }}
        onSubmit={async (values) => {
          await onSave(values);
        }}
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
            <FormDialogActions
              pending={pending}
              onCancel={onClose}
              submitLabel={common('saveChanges')}
            />
          </>
        )}
      </Form>
    </FormDialog>
  );
}
