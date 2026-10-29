import type { Route, RouteStation } from '@/features/routes';
import type { Bus } from '@/features/buses';
export type TripOptions = {
  routes: Route[];
  stations: RouteStation[];
  buses: Bus[];
};
