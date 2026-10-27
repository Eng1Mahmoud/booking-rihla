'use client';
import { useLocale } from 'next-intl';
import { useId } from 'react';
import { Temporal } from 'temporal-polyfill';
import { Link } from '@/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/forms/Form';
import { DatePickr, TimePicker } from '@/shared/components/forms/DatePickr';
import { FormInput } from '@/shared/components/forms/FormInput';
import { FormSelect } from '@/shared/components/forms/FormSelect';
import { SubmitButton } from '@/shared/components/forms/SubmitButton';
import { NativeSelectOption } from '@/shared/components/ui/native-select';
import { FieldError } from '@/shared/components/ui/field';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { ListError } from '@/shared/components/feedback/ListError';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableCaption,
} from '@/shared/components/ui/table';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import { formatReportTime } from '@/features/dashboard/lib/format';
import { batchFormSchema } from '../schemas/tripSchema';
import { useTripBatch } from '../hooks/useTripBatch';
export function TripBatchManager() {
  const weekdaysErrorId = useId();
  const page = useTripBatch(),
    locale = useLocale(),
    t = page.t;
  const tomorrow = Temporal.Now.plainDateISO('Africa/Cairo')
    .add({ days: 1 })
    .toString();
  return (
    <section className="min-w-0">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('batch')}</h1>
          <p className="mt-2 max-w-[65ch] text-muted-foreground">
            {t('batchHint')}
          </p>
        </div>
        <Button asChild variant="outline" className="min-h-11">
          <Link href="/dashboard/trips">{t('backToTrips')}</Link>
        </Button>
      </div>
      {page.options.isError && (
        <ListError
          title={t('readFailed')}
          description={t('readFailedHint')}
          pending={page.options.isFetching}
          onRetry={() => {
            void page.options.refetch();
          }}
        />
      )}
      {page.options.isPending && <p role="status">{t('loading')}</p>}
      {page.options.data && (
        <div onChangeCapture={page.clearReview}>
          <Form
            schema={batchFormSchema}
            serverErrorFields={{
              BUS_SCHEDULE_CONFLICT: [
                'busId',
                'departureTime',
                'durationMinutes',
              ],
              INVALID_DEPARTURE_TIME: ['departureTime'],
              NO_DEPARTURES: ['weekdays', 'startDate', 'endDate'],
              BUS_INACTIVE: ['busId'],
              ROUTE_INACTIVE: ['routeId'],
            }}
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
              await page.preview.mutateAsync(input);
            }}
            className="rounded-2xl border bg-card p-5 sm:p-7"
          >
            {(form) => (
              <>
                <fieldset
                  disabled={page.pending}
                  className="grid min-w-0 gap-5 sm:grid-cols-2"
                >
                  <FormSelect name="routeId" label={t('route')}>
                    <NativeSelectOption value="">
                      {t('chooseRoute')}
                    </NativeSelectOption>
                    {page.options.data!.routes.map((route) => (
                      <NativeSelectOption
                        key={route.id}
                        value={route.id}
                        disabled={!route.isActive}
                      >
                        {routeLabel(route, page.options.data!.stations, locale)}
                      </NativeSelectOption>
                    ))}
                  </FormSelect>
                  <FormSelect name="busId" label={t('bus')}>
                    <NativeSelectOption value="">
                      {t('chooseBus')}
                    </NativeSelectOption>
                    {page.options.data!.buses.map((bus) => (
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
                  <fieldset
                    className="grid gap-2 sm:col-span-2"
                    aria-invalid={!!form.formState.errors.weekdays}
                    aria-describedby={
                      form.formState.errors.weekdays
                        ? weekdaysErrorId
                        : undefined
                    }
                  >
                    <legend className="mb-3 text-sm font-medium">
                      {t('weekdays')}
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                        <label
                          key={day}
                          className="flex min-h-11 items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            value={String(day)}
                            {...form.register('weekdays')}
                            className="size-5 accent-primary"
                          />
                          {t('day' + day)}
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.weekdays && (
                      <FieldError
                        id={weekdaysErrorId}
                        errors={[form.formState.errors.weekdays]}
                      />
                    )}
                  </fieldset>
                </fieldset>
                <p className="text-sm text-muted-foreground">{t('timeHint')}</p>
                <SubmitButton disabled={page.pending}>
                  {t('preview')}
                </SubmitButton>
              </>
            )}
          </Form>
        </div>
      )}
      {page.notice && (
        <p role="status" className="mt-5 text-primary">
          {page.notice}
        </p>
      )}
      {page.error && (
        <Alert variant="destructive" className="mt-5">
          <AlertDescription>{page.error}</AlertDescription>
        </Alert>
      )}
      {page.review && (
        <section className="mt-8 min-w-0" aria-labelledby="batch-review-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 id="batch-review-title" className="text-xl font-semibold">
                {t('reviewCount', { count: page.review.preview.totalTrips })}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  page.review.preview.canCreate
                    ? 'readyToCreate'
                    : 'conflictsFound',
                )}
              </p>
            </div>
            <Button
              disabled={!page.review.preview.canCreate || page.pending}
              onClick={() => page.create.mutate()}
              className="min-h-12"
            >
              {t(page.create.isPending ? 'creatingBatch' : 'createBatch', {
                count: page.review.preview.totalTrips,
              })}
            </Button>
          </div>
          <div className="min-w-0 overflow-hidden rounded-2xl border bg-card">
            <Table className="min-w-160">
              <TableCaption className="sr-only">{t('batch')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('departure')}</TableHead>
                  <TableHead>{t('arrival')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.review.preview.trips.map((trip) => (
                  <TableRow key={trip.date}>
                    <TableCell>
                      {formatReportTime(trip.departureAt, locale)}
                    </TableCell>
                    <TableCell>
                      {formatReportTime(trip.arrivalAt, locale)}
                    </TableCell>
                    <TableCell>
                      {trip.conflicts.length
                        ? t('conflictCount', { count: trip.conflicts.length })
                        : t('noConflict')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </section>
  );
}
