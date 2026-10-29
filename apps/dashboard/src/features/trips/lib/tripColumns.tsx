import { Ban } from 'lucide-react';
import { RowActions } from '@/shared/components/tables';
import type { DataTableColumn } from '@/shared/lib';
import { routeLabel } from '@/features/routes';
import { formatReportTime, formatGrossPaid } from '@/features/dashboard';
import type { Trip } from '../schemas/tripSchema';
import type { TripOptions } from '../types/trip';
export function createTripColumns({
  locale,
  options,
  labels,
  onEdit,
  onDelete,
  onCancel,
  superAdmin,
}: {
  locale: string;
  options: TripOptions;
  labels: Record<string, string>;
  onEdit: (trip: Trip) => void;
  onDelete: (trip: Trip) => void;
  onCancel: (trip: Trip) => void;
  superAdmin: boolean;
}): DataTableColumn<Trip>[] {
  const name = (trip: Trip) => {
    const route = options.routes.find((route) => route.id === trip.routeId);
    return route ? routeLabel(route, options.stations, locale) : trip.routeId;
  };
  return [
    {
      id: 'route',
      header: labels.route,
      meta: { headerClassName: 'w-60' },
      cell: ({ row }) => name(row.original),
    },
    {
      id: 'bus',
      header: labels.bus,
      cell: ({ row }) => (
        <bdi>
          {options.buses.find((bus) => bus.id === row.original.busId)
            ?.plateNumber ?? row.original.busId}
        </bdi>
      ),
    },
    {
      id: 'departure',
      header: labels.departure,
      cell: ({ row }) => formatReportTime(row.original.departureAt, locale),
    },
    {
      id: 'arrival',
      header: labels.arrival,
      cell: ({ row }) => formatReportTime(row.original.arrivalAt, locale),
    },
    {
      id: 'price',
      header: labels.price,
      cell: ({ row }) =>
        formatGrossPaid(String(row.original.pricePiastres), locale),
    },
    {
      id: 'status',
      header: labels.status,
      cell: ({ row }) =>
        row.original.status === 'SCHEDULED'
          ? labels.scheduled
          : labels.cancelled,
    },
    {
      id: 'actions',
      header: labels.actions,
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => {
        const trip = row.original,
          closed =
            trip.status === 'CANCELLED' ||
            Date.parse(trip.departureAt) <= Date.now();
        if (closed)
          return (
            <span className="text-sm text-muted-foreground">
              {labels.closed}
            </span>
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
                      label: labels.cancel!,
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
