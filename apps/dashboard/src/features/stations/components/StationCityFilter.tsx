'use client';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { City } from '@/features/cities/types/city';
export function StationCityFilter({
  cities,
  value,
  onChange,
  disabled,
}: {
  cities: City[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
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
        onChange={(event) => onChange(event.target.value)}
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
