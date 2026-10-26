'use client';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/shared/components/ui/native-select';
import type { DataTableState } from '@/shared/hooks/useDataTableState';
import type { RouteListQuery } from '../schemas/routeSchema';
import { stationLabel, type RouteStation } from '../lib/routeColumns';
type Filters = Pick<
  RouteListQuery,
  'originStationId' | 'destinationStationId' | 'isActive'
>;
export function RouteFilters({
  state,
  stations,
  disabled,
}: {
  state: DataTableState<Filters>;
  stations: RouteStation[];
  disabled: boolean;
}) {
  const id = useId(),
    t = useTranslations('Routes'),
    locale = useLocale();
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
            value={state.filters[name]}
            onChange={(event) => state.setFilter(name, event.target.value)}
            className="h-12 bg-card"
          >
            <NativeSelectOption value="">{t('allStations')}</NativeSelectOption>
            {state.filters[name] &&
              !stations.some(
                (station) => station.id === state.filters[name],
              ) && (
                <NativeSelectOption value={state.filters[name]}>
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
          value={state.filters.isActive}
          disabled={disabled}
          onChange={(event) =>
            state.setFilter(
              'isActive',
              event.target.value as Filters['isActive'],
            )
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
