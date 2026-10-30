'use client';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import { useSearchParams } from 'next/navigation';

import { routeLabel } from '@/features/routes/lib/routeColumns';
import type { TripListQuery } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';
type Filters = Pick<TripListQuery, 'routeId' | 'busId' | 'status'>;
export function TripFilters({
  options,
  disabled,
}: {
  options: TripOptions;
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
    routeId: urlParams.get('filter.routeId') ?? '',
    busId: urlParams.get('filter.busId') ?? '',
    status: urlParams.get('filter.status') ?? '',
  } as Filters;
  const id = useId();
  const t = useTranslations('Trips');
  const locale = useLocale();
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-3">
      <div className="min-w-0">
        <label
          htmlFor={id + 'route'}
          className="mb-2 block text-sm font-medium"
        >
          {t('route')}
        </label>
        <NativeSelect
          id={id + 'route'}
          disabled={disabled}
          value={activeFilters.routeId}
          onChange={(event) => updateFilter('routeId', event.target.value)}
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('allRoutes')}</NativeSelectOption>
          {activeFilters.routeId &&
            !options.routes.some(
              (route) => route.id === activeFilters.routeId,
            ) && (
              <NativeSelectOption value={activeFilters.routeId}>
                {t('missingOption')}
              </NativeSelectOption>
            )}
          {options.routes.map((route) => (
            <NativeSelectOption key={route.id} value={route.id}>
              {routeLabel(route, options.stations, locale)}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="min-w-0">
        <label htmlFor={id + 'bus'} className="mb-2 block text-sm font-medium">
          {t('bus')}
        </label>
        <NativeSelect
          id={id + 'bus'}
          disabled={disabled}
          value={activeFilters.busId}
          onChange={(event) => updateFilter('busId', event.target.value)}
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('allBuses')}</NativeSelectOption>
          {activeFilters.busId &&
            !options.buses.some((bus) => bus.id === activeFilters.busId) && (
              <NativeSelectOption value={activeFilters.busId}>
                {t('missingOption')}
              </NativeSelectOption>
            )}
          {options.buses.map((bus) => (
            <NativeSelectOption key={bus.id} value={bus.id}>
              {bus.plateNumber}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <div className="min-w-0">
        <label
          htmlFor={id + 'status'}
          className="mb-2 block text-sm font-medium"
        >
          {t('status')}
        </label>
        <NativeSelect
          id={id + 'status'}
          disabled={disabled}
          value={activeFilters.status}
          onChange={(event) =>
            updateFilter('status', event.target.value as Filters['status'])
          }
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('allStatuses')}</NativeSelectOption>
          <NativeSelectOption value="SCHEDULED">
            {t('scheduled')}
          </NativeSelectOption>
          <NativeSelectOption value="CANCELLED">
            {t('cancelled')}
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
