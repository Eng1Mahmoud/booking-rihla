'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Ban } from 'lucide-react';
import { RowActions } from '@/shared/components/tables/RowActions';
import type { DataTableColumn } from '@/shared/lib/dataTable';
import { routeLabel } from '@/features/routes/lib/routeColumns';
import {
  formatReportTime,
  formatGrossPaid,
} from '@/features/dashboard/lib/format';
import type { Trip } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';
export function useTripColumns({
  options,
  onEdit,
  onDelete,
  onCancel,
  superAdmin,
}: {
  options: TripOptions;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onCancel: (trip: Trip) => void;
  superAdmin: boolean;
}): DataTableColumn<Trip>[] {
  const locale = useLocale();
  const t = useTranslations('Trips');
  const common = useTranslations('Common');
  const name = (trip: Trip) => {
    const route = options.routes.find((route) => route.id === trip.routeId);
    return route ? routeLabel(route, options.stations, locale) : trip.routeId;
  };
  return [
    {
      id: 'route',
      header: t('route'),
      meta: { headerClassName: 'w-60' },
      cell: ({ row }) => name(row.original),
    },
    {
      id: 'bus',
      header: t('bus'),
      cell: ({ row }) => (
        <bdi>
          {options.buses.find((bus) => bus.id === row.original.busId)
            ?.plateNumber ?? row.original.busId}
        </bdi>
      ),
    },
    {
      id: 'departure',
      header: t('departure'),
      cell: ({ row }) => formatReportTime(row.original.departureAt, locale),
    },
    {
      id: 'arrival',
      header: t('arrival'),
      cell: ({ row }) => formatReportTime(row.original.arrivalAt, locale),
    },
    {
      id: 'price',
      header: t('price'),
      cell: ({ row }) =>
        formatGrossPaid(String(row.original.pricePiastres), locale),
    },
    {
      id: 'status',
      header: t('status'),
      cell: ({ row }) =>
        row.original.status === 'SCHEDULED' ? t('scheduled') : t('cancelled'),
    },
    {
      id: 'actions',
      header: common('actions'),
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => {
        const trip = row.original;
        const closed =
          trip.status === 'CANCELLED' ||
          Date.parse(trip.departureAt) <= Date.now();
        if (closed)
          return (
            <span className="text-sm text-muted-foreground">{t('closed')}</span>
          );
        return (
          <RowActions
            name={name(trip)}
            onEdit={() => onEdit(trip)}
            onDelete={() => onDelete(trip)}
            additionalActions={
              superAdmin
                ? [
                    {
                      label: t('cancel'),
                      icon: Ban,
                      destructive: true,
                      onSelect: () => onCancel(trip),
                    },
                  ]
                : []
            }
          />
        );
      },
    },
  ];
}
