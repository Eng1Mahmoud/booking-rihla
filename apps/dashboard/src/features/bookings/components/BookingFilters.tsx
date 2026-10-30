'use client';
import { Button } from '@/shared/components/ui/button';
import { DatePickr } from '@/shared/components/ui/date-pickr';
import { Input } from '@/shared/components/ui/input';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

const filterFields = ['reference', 'email', 'travelDate'] as const;

export function BookingFilters() {
  const urlParams = useSearchParams();
  const activeFilters = {
    reference: urlParams.get('filter.reference') ?? '',
    email: urlParams.get('filter.email') ?? '',
    travelDate: urlParams.get('filter.travelDate') ?? '',
    tripId: urlParams.get('filter.tripId') ?? '',
    userId: urlParams.get('filter.userId') ?? '',
  };
  const t = useTranslations('Bookings');
  const filterId = useId();
  // Preserve linked trip/user filters when applying the visible search fields.
  return (
    <form
      key={JSON.stringify(activeFilters)}
      className="mb-5 flex flex-wrap items-end gap-4 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);

        const url = new URL(window.location.href);
        for (const name of filterFields) {
          const value = String(data.get(name) ?? '').trim();
          if (value) url.searchParams.set('filter.' + name, value);
          else url.searchParams.delete('filter.' + name);
        }
        url.searchParams.delete('filter.search');
        url.searchParams.delete('offset');
        if (url.href !== window.location.href)
          window.history.pushState(
            null,
            '',
            url.pathname + url.search + url.hash,
          );
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
              defaultValue={activeFilters[field]}
              className="min-h-11 bg-card"
            />
          ) : (
            <Input
              id={filterId + field}
              name={field}
              type={field === 'email' ? 'email' : 'text'}
              defaultValue={activeFilters[field]}
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
          const url = new URL(window.location.href);
          for (const name of Array.from(url.searchParams.keys())) {
            if (name.startsWith('filter.')) url.searchParams.delete(name);
          }
          url.searchParams.delete('offset');
          if (url.href !== window.location.href)
            window.history.pushState(
              null,
              '',
              url.pathname + url.search + url.hash,
            );
        }}
      >
        {t('clear')}
      </Button>
    </form>
  );
}
