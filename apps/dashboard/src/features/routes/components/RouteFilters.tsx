'use client';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import { stationLabel, type RouteStation } from '../lib/routeColumns';
import type { RouteListQuery } from '../schemas/routeSchema';

type Filters = Pick<
  RouteListQuery,
  'originStationId' | 'destinationStationId' | 'isActive'
>;
export function RouteFilters({
  stations,
  disabled,
}: {
  stations: RouteStation[];
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
    originStationId: urlParams.get('filter.originStationId') ?? '',
    destinationStationId: urlParams.get('filter.destinationStationId') ?? '',
    isActive: urlParams.get('filter.isActive') ?? '',
  } as Filters;
  const id = useId();
  const t = useTranslations('Routes');
  const locale = useLocale();
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-3">
      {(['originStationId', 'destinationStationId'] as const).map((name) => (
        <div key={name} className="min-w-0">
          <label htmlFor={id + name} className="mb-2 block text-sm font-medium">
            {t(name === 'originStationId' ? 'origin' : 'destination')}
          </label>
          <NativeSelect
            id={id + name}
            disabled={disabled}
            value={activeFilters[name]}
            onChange={(event) => updateFilter(name, event.target.value)}
            className="h-12 bg-card"
          >
            <NativeSelectOption value="">{t('allStations')}</NativeSelectOption>
            {activeFilters[name] &&
              !stations.some(
                (station) => station.id === activeFilters[name],
              ) && (
                <NativeSelectOption value={activeFilters[name]}>
                  {t('missingStation')}
                </NativeSelectOption>
              )}
            {stations.map((station) => (
              <NativeSelectOption key={station.id} value={station.id}>
                {stationLabel(station, locale)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ))}
      <div className="min-w-0">
        <label
          htmlFor={id + 'status'}
          className="mb-2 block text-sm font-medium"
        >
          {t('status')}
        </label>
        <NativeSelect
          id={id + 'status'}
          value={activeFilters.isActive}
          disabled={disabled}
          onChange={(event) =>
            updateFilter('isActive', event.target.value as Filters['isActive'])
          }
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('all')}</NativeSelectOption>
          <NativeSelectOption value="true">{t('active')}</NativeSelectOption>
          <NativeSelectOption value="false">{t('inactive')}</NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
