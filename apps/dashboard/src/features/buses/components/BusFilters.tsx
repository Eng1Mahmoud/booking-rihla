'use client';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';

import type { BusOptions } from '../types/bus';
export function BusFilters({
  options,
  disabled,
}: {
  options?: BusOptions;
  disabled: boolean;
}) {
  function updateFilter(name: string, value: string) {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set('filter.' + name, value);
    else url.searchParams.delete('filter.' + name);
    url.searchParams.delete('offset');
    if (url.href !== window.location.href)
      window.history.pushState(null, '', url.pathname + url.search + url.hash);
  }

  const urlParams = useSearchParams();
  const activeFilters = {
    busTypeId: urlParams.get('filter.busTypeId') ?? '',
    isActive: urlParams.get('filter.isActive') ?? '',
  };
  const typeId = activeFilters.busTypeId;
  const status = activeFilters.isActive;
  const t = useTranslations('Buses');
  const locale = useLocale();
  const id = useId();
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="min-w-0">
        <label
          htmlFor={id + '-type'}
          className="mb-2 block text-sm font-medium"
        >
          {t('busType')}
        </label>
        <NativeSelect
          id={id + '-type'}
          value={typeId}
          disabled={disabled}
          className="h-12 bg-card"
          onChange={(event) => updateFilter('busTypeId', event.target.value)}
        >
          <NativeSelectOption value="">{t('allTypes')}</NativeSelectOption>
          {typeId && !options?.busTypes.some((item) => item.id === typeId) && (
            <NativeSelectOption value={typeId}>
              {t('missingType')}
            </NativeSelectOption>
          )}
          {options?.busTypes.map((item) => (
            <NativeSelectOption key={item.id} value={item.id}>
              {item[locale === 'ar' ? 'nameAr' : 'nameEn']}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="min-w-0">
        <label
          htmlFor={id + '-status'}
          className="mb-2 block text-sm font-medium"
        >
          {t('status')}
        </label>
        <NativeSelect
          id={id + '-status'}
          value={status}
          disabled={disabled}
          className="h-12 bg-card"
          onChange={(event) => {
            const value = event.target.value;
            if (value === '' || value === 'true' || value === 'false')
              updateFilter('isActive', value);
          }}
        >
          <NativeSelectOption value="">{t('allStatuses')}</NativeSelectOption>
          <NativeSelectOption value="true">{t('active')}</NativeSelectOption>
          <NativeSelectOption value="false">{t('inactive')}</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
