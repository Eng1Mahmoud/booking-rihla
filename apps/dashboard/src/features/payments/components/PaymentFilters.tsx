'use client';
import { Button } from '@/shared/components/ui/button';
import { DatePickr } from '@/shared/components/ui/date-pickr';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { type PaymentFilterValues as FilterValues } from '../schemas/paymentSchema';
const primary = ['reference', 'email', 'createdDate'];
export function PaymentFilters() {
  const urlParams = useSearchParams();
  const activeFilters = {
    reference: urlParams.get('filter.reference') ?? '',
    email: urlParams.get('filter.email') ?? '',
    createdDate: urlParams.get('filter.createdDate') ?? '',
    bookingId: urlParams.get('filter.bookingId') ?? '',
    tripId: urlParams.get('filter.tripId') ?? '',
    userId: urlParams.get('filter.userId') ?? '',
    orderId: urlParams.get('filter.orderId') ?? '',
    transactionId: urlParams.get('filter.transactionId') ?? '',
    intentionId: urlParams.get('filter.intentionId') ?? '',
    sessionStatus: urlParams.get('filter.sessionStatus') ?? '',
    settlementStatus: urlParams.get('filter.settlementStatus') ?? '',
  };
  const id = useId();
  const t = useTranslations('Payments');
  const states = useTranslations('States');
  const fields = (names: (keyof FilterValues)[]) =>
    names.map((name) => (
      <div key={name} className="grid min-w-0 gap-2 text-sm">
        <label htmlFor={id + name}>{t(name)}</label>
        {name === 'createdDate' ? (
          <DatePickr
            id={id + name}
            name="createdDate"
            defaultValue={activeFilters[name]}
            className="h-12 bg-card"
          />
        ) : (
          <Input
            id={id + name}
            name={name}
            type={name === 'email' ? 'email' : 'text'}
            defaultValue={activeFilters[name]}
            dir="ltr"
            className="h-12 bg-card"
          />
        )}
      </div>
    ));
  return (
    <form
      key={JSON.stringify(activeFilters)}
      className="mb-5 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 xl:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const url = new URL(window.location.href);
        for (const name of Object.keys(activeFilters)) {
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
      {fields(['reference', 'email', 'createdDate'])}
      <details
        className="min-w-0 sm:col-span-2 xl:col-span-3"
        open={
          Object.entries(activeFilters).some(
            ([key, value]) => !primary.includes(key) && Boolean(value),
          ) || undefined
        }
      >
        <summary className="min-h-11 cursor-pointer py-3 font-medium text-primary">
          {t('moreFilters')}
        </summary>
        <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {fields([
            'bookingId',
            'tripId',
            'userId',
            'orderId',
            'transactionId',
            'intentionId',
          ])}
          {(['sessionStatus', 'settlementStatus'] as const).map((name) => (
            <div key={name} className="grid gap-2 text-sm">
              <label htmlFor={id + name}>{t(name)}</label>
              <NativeSelect
                id={id + name}
                name={name}
                defaultValue={activeFilters[name]}
                className="h-12 bg-card"
              >
                <NativeSelectOption value="">{t('all')}</NativeSelectOption>
                {(name === 'sessionStatus'
                  ? ['REQUESTING', 'READY', 'UNKNOWN', 'FAILED', 'EXPIRED']
                  : ['REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'REVIEW']
                ).map((status) => (
                  <NativeSelectOption key={status} value={status}>
                    {states(status)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3">
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
      </div>
    </form>
  );
}
