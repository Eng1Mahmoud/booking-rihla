'use client';
import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { NativeSelect, NativeSelectOption } from '@/shared/components/ui';
import type { DataTableState } from '@/shared/hooks';
import { routeLabel } from '@/features/routes';
import type { TripListQuery } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';
type Filters = Pick<TripListQuery, 'routeId' | 'busId' | 'status'>;
export function TripFilters({
  state,
  options,
  disabled,
}: {
  state: DataTableState<Filters>;
  options: TripOptions;
  disabled: boolean;
}) {
  const id = useId(),
    t = useTranslations('Trips'),
    locale = useLocale();
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
          value={state.filters.routeId}
          onChange={(event) => state.setFilter('routeId', event.target.value)}
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('allRoutes')}</NativeSelectOption>
          {state.filters.routeId &&
            !options.routes.some(
              (route) => route.id === state.filters.routeId,
            ) && (
              <NativeSelectOption value={state.filters.routeId}>
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
          value={state.filters.busId}
          onChange={(event) => state.setFilter('busId', event.target.value)}
          className="h-12 bg-card"
        >
          <NativeSelectOption value="">{t('allBuses')}</NativeSelectOption>
          {state.filters.busId &&
            !options.buses.some((bus) => bus.id === state.filters.busId) && (
              <NativeSelectOption value={state.filters.busId}>
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
          value={state.filters.status}
          onChange={(event) =>
            state.setFilter('status', event.target.value as Filters['status'])
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
