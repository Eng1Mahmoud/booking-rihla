import type { z } from 'zod';
import type { stationRowSchema } from '@/features/stations';
import type { Route } from '../schemas/routeSchema';
import type { DataTableColumn } from '@/shared/lib';
import { RowActions } from '@/shared/components/tables';
export type RouteStation = z.infer<typeof stationRowSchema>;
export function stationLabel(station: RouteStation, locale: string) {
  return locale === 'ar'
    ? station.city.nameAr + ' — ' + station.nameAr
    : station.city.nameEn + ' — ' + station.nameEn;
}
export function routeLabel(
  route: Route,
  stations: RouteStation[],
  locale: string,
) {
  const name = (id: string) => {
    const station = stations.find((s) => s.id === id);
    return station ? stationLabel(station, locale) : id;
  };
  return name(route.originStationId) + ' → ' + name(route.destinationStationId);
}
export function createRouteColumns(options: {
  locale: string;
  stations: RouteStation[];
  labels: {
    origin: string;
    destination: string;
    duration: string;
    status: string;
    active: string;
    inactive: string;
    actions: string;
  };
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
}): DataTableColumn<Route>[] {
  const { stations, locale, labels } = options;
  const name = (id: string) => {
    const station = stations.find((s) => s.id === id);
    return station ? stationLabel(station, locale) : id;
  };
  return [
    {
      id: 'origin',
      header: labels.origin,
      cell: ({ row }) => name(row.original.originStationId),
    },
    {
      id: 'destination',
      header: labels.destination,
      cell: ({ row }) => name(row.original.destinationStationId),
    },
    {
      id: 'duration',
      header: labels.duration,
      cell: ({ row }) =>
        new Intl.NumberFormat(locale).format(
          row.original.estimatedDurationMinutes,
        ),
    },
    {
      id: 'status',
      header: labels.status,
      cell: ({ row }) =>
        row.original.isActive ? labels.active : labels.inactive,
    },
    {
      id: 'actions',
      header: labels.actions,
      meta: { headerClassName: 'w-24 text-center' },
      cell: ({ row }) => (
        <RowActions
          name={routeLabel(row.original, stations, locale)}
          onEdit={() => options.onEdit(row.original)}
          onDelete={() => options.onDelete(row.original)}
        />
      ),
    },
  ];
}
