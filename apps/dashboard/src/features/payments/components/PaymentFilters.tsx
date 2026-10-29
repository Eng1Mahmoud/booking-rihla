'use client';
import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { DatePickr } from '@/shared/components/ui/date-pickr';
import { Input } from '@/shared/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { DataTableState } from '@/shared/hooks/useDataTableState';
import {
  emptyPaymentFilters,
  type PaymentFilterValues as FilterValues,
} from '../schemas/paymentSchema';
const primary = ['reference', 'email', 'createdDate'];
export function PaymentFilters({
  state,
}: {
  state: DataTableState<FilterValues>;
}) {
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
            defaultValue={state.filters[name]}
            className="h-12 bg-card"
          />
        ) : (
          <Input
            id={id + name}
            name={name}
            type={name === 'email' ? 'email' : 'text'}
            defaultValue={state.filters[name]}
            dir="ltr"
            className="h-12 bg-card"
          />
        )}
      </div>
    ));
  return (
    <form
      key={JSON.stringify(state.filters)}
      className="mb-5 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 xl:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        state.resetFilters(
          Object.fromEntries(
            Object.keys(state.filters).map((key) => [
              key,
              String(data.get(key) ?? '').trim(),
            ]),
          ) as FilterValues,
        );
      }}
    >
      {fields(['reference', 'email', 'createdDate'])}
      <details
        className="min-w-0 sm:col-span-2 xl:col-span-3"
        open={
          Object.entries(state.filters).some(
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
                defaultValue={state.filters[name]}
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
            state.resetFilters(emptyPaymentFilters);
          }}
        >
          {t('clear')}
        </Button>
      </div>
    </form>
  );
}
