import type { Route } from '@/features/routes/schemas/routeSchema';
import type { RouteStation } from '@/features/routes/lib/routeColumns';
import type { Bus } from '@/features/buses/types/bus';
export type TripOptions = {
  routes: Route[];
  stations: RouteStation[];
  buses: Bus[];
};
