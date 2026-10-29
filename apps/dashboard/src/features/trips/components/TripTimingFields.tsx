'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useWatch } from 'react-hook-form';
import { DatePickr, TimePicker } from '@/shared/components/forms/DatePickr';
import { FormInput } from '@/shared/components/forms/FormInput';
import { calculateTripSchedule } from '../lib/tripTime';
import type { TripFormValues } from '../schemas/tripSchema';

export function TripTimingFields() {
  const t = useTranslations('Trips');
  const locale = useLocale();
  const [date, time, duration] = useWatch<
    TripFormValues,
    ['departureDate', 'departureTime', 'durationMinutes']
  >({ name: ['departureDate', 'departureTime', 'durationMinutes'] });
  const schedule = calculateTripSchedule(date, time, Number(duration));
  const format = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return (
    <>
      <DatePickr<TripFormValues>
        name="departureDate"
        label={t('departureDate')}
      />
      <TimePicker<TripFormValues>
        name="departureTime"
        label={t('departureTime')}
      />
      <FormInput<TripFormValues>
        name="durationMinutes"
        type="number"
        min="0.001"
        step="any"
        label={t('duration')}
      />
      <div
        className="rounded-2xl bg-secondary p-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <p className="text-sm text-muted-foreground">
          {t('calculatedArrival')}
        </p>
        <p className="mt-1 font-semibold text-secondary-foreground">
          {schedule ? (
            <time dateTime={schedule.arrivalAt}>
              {format.format(new Date(schedule.arrivalAt))}
            </time>
          ) : (
            t('arrivalHint')
          )}
        </p>
      </div>
    </>
  );
}
