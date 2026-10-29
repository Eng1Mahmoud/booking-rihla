'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { DatePickr } from '@/shared/components/ui/date-pickr';
import type { DataTableState } from '@/shared/hooks/useDataTableState';
import type { BookingFilters as FilterValues } from '../schemas/bookingSchema';

const filterFields = ['reference', 'email', 'travelDate'] as const;

export function BookingFilters({
  state,
}: {
  state: DataTableState<FilterValues>;
}) {
  const t = useTranslations('Bookings');
  const filterId = useId();
  // Preserve linked trip/user filters when applying the visible search fields.
  return (
    <form
      key={JSON.stringify(state.filters)}
      className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const filters = Object.fromEntries(
          filterFields.map((key) => [key, String(data.get(key) ?? '').trim()]),
        );
        state.resetFilters({ ...state.filters, ...filters });
      }}
    >
      {filterFields.map((field) => (
        <label
          key={field}
          htmlFor={filterId + field}
          className="grid min-w-0 flex-1 basis-44 gap-2 text-sm"
        >
          <span>{t(field)}</span>
          {field === 'travelDate' ? (
            <DatePickr
              id={filterId + field}
              name="travelDate"
              defaultValue={state.filters[field]}
              className="min-h-11 bg-card"
            />
          ) : (
            <Input
              id={filterId + field}
              name={field}
              type={field === 'email' ? 'email' : 'text'}
              defaultValue={state.filters[field]}
              dir="ltr"
              className="min-h-11 bg-card"
            />
          )}
        </label>
      ))}
      <Button type="submit" className="min-h-11">
        {t('apply')}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        onClick={(event) => {
          event.currentTarget.form?.reset();
          state.resetFilters({
            reference: '',
            email: '',
            travelDate: '',
            tripId: '',
            userId: '',
          });
        }}
      >
        {t('clear')}
      </Button>
    </form>
  );
}
