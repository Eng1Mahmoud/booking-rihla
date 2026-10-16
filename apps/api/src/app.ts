import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { AppError } from './errors/AppError.ts';
import { errorHandler } from './middlewares/errorHandler.ts';
import { createCityRouter } from './routes/cityRoutes.ts';
import { cityService, type CityService } from './services/cityService.ts';
import {
  stationService,
  type StationService,
} from './services/stationService.ts';
import { createStationRouter } from './routes/stationRoutes.ts';
import { busService, type BusService } from './services/busService.ts';
import { createBusRouter } from './routes/busRoutes.ts';

import { routeService, type RouteService } from './services/routeService.ts';
import { createRouteRouter } from './routes/routeRoutes.ts';

import { tripService, type TripService } from './services/tripService.ts';
import { createTripRouter } from './routes/tripRoutes.ts';

import type { TripSearchService } from './services/tripSearchService.ts';

import type { TripDetailsService } from './services/tripDetailsService.ts';

import { authService, type AuthService } from './services/authService.ts';
import { createAuthRouter } from './routes/authRoutes.ts';

export function createApp(
  corsOrigins: string[],
  services: {
    cities?: CityService;
    stations?: StationService;
    buses?: BusService;
    routes?: RouteService;
    trips?: TripService;
    tripSearch?: TripSearchService;
    tripDetails?: TripDetailsService;
    auth?: AuthService;
  } = {},
) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/v1/cities', createCityRouter(services.cities ?? cityService));
  app.use(
    '/api/v1/stations',
    createStationRouter(services.stations ?? stationService),
  );

  app.use('/api/v1/buses', createBusRouter(services.buses ?? busService));

  app.use('/api/v1/routes', createRouteRouter(services.routes ?? routeService));

  app.use(
    '/api/v1/trips',
    createTripRouter(
      services.trips ?? tripService,
      services.tripSearch,
      services.tripDetails,
    ),
  );

  app.use('/api/v1/auth', createAuthRouter(services.auth ?? authService));

  // This runs only if none of the routes above handled the request.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
