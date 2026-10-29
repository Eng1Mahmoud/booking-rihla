import type { StationRow } from '@/features/stations/types/station';
import type { Route } from '../schemas/routeSchema';
export type RouteStation = StationRow;
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
