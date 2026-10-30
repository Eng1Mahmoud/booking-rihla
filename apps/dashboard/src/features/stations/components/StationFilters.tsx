'use client';
import { useSearchParams } from 'next/navigation';

import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { City } from '@/features/cities/types/city';
export function StationFilters({
  cities,
  disabled,
}: {
  cities: City[];
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
  const activeFilters = { cityId: urlParams.get('filter.cityId') ?? '' };
  const value = activeFilters.cityId;
  const t = useTranslations('Stations');
  const locale = useLocale();
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 block text-sm font-medium">
        {t('city')}
      </label>
      <NativeSelect
        id={id}
        value={value}
        disabled={disabled}
        className="h-12 bg-card"
        onChange={(event) => updateFilter('cityId', event.target.value)}
      >
        <NativeSelectOption value="">{t('allCities')}</NativeSelectOption>
        {value && !cities.some((city) => city.id === value) && (
          <NativeSelectOption value={value}>
            {t('missingCity')}
          </NativeSelectOption>
        )}
        {cities.map((city) => (
          <NativeSelectOption key={city.id} value={city.id}>
            {locale === 'ar' ? city.nameAr : city.nameEn}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}
