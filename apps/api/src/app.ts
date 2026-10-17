import {
  administratorService,
  type AdministratorService,
} from './services/administratorService.ts';
import { createAdministratorRouter } from './routes/administratorRoutes.ts';
import {
  adminUserService,
  type AdminUserService,
} from './services/adminUserService.ts';
import { createAdminUserRouter } from './routes/adminUserRoutes.ts';
import {
  adminBookingService,
  type AdminBookingService,
} from './services/adminBookingService.ts';
import { createAdminBookingRouter } from './routes/adminBookingRoutes.ts';
import type { TripBatchService } from './services/tripBatchService.ts';
import {
  busTypeService,
  type BusTypeService,
} from './services/busTypeService.ts';
import {
  amenityService,
  type AmenityService,
} from './services/amenityService.ts';
import { createBusTypeRouter } from './routes/busTypeRoutes.ts';
import { createAmenityRouter } from './routes/amenityRoutes.ts';
import {
  bookingService,
  type BookingService,
} from './services/bookingService.ts';
import { createBookingRouter } from './routes/bookingRoutes.ts';
import express from 'express';
import { requireAuth } from './middlewares/requireAuth.ts';
import { requireRole } from './middlewares/requireRole.ts';
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

import {
  sessionService,
  type SessionService,
} from './services/sessionService.ts';
import { createSessionRouter } from './routes/sessionRoutes.ts';

import {
  passwordResetService,
  type PasswordResetService,
} from './services/passwordResetService.ts';
import { createPasswordResetRouter } from './routes/passwordResetRoutes.ts';

export function createApp(
  corsOrigins: string[],
  services: {
    cities?: CityService;
    stations?: StationService;
    buses?: BusService;
    routes?: RouteService;
    trips?: TripService;
    tripBatches?: TripBatchService;
    tripSearch?: TripSearchService;
    tripDetails?: TripDetailsService;
    auth?: AuthService;
    sessions?: SessionService;
    passwordReset?: PasswordResetService;
    bookings?: BookingService;
    adminBookings?: AdminBookingService;
    adminUsers?: AdminUserService;
    administrators?: AdministratorService;
    busTypes?: BusTypeService;
    amenities?: AmenityService;
  } = {},
) {
  const app = express();

  const admin = [
    requireAuth(services.sessions ?? sessionService),
    requireRole('ADMIN', 'SUPER_ADMIN'),
  ];

  const superAdmin = [
    requireAuth(services.sessions ?? sessionService),
    requireRole('SUPER_ADMIN'),
  ];

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use(
    '/api/v1/cities',
    createCityRouter(services.cities ?? cityService, admin),
  );
  app.use(
    '/api/v1/stations',
    createStationRouter(services.stations ?? stationService, admin),
  );

  app.use(
    '/api/v1/buses',
    createBusRouter(services.buses ?? busService, admin),
  );

  app.use(
    '/api/v1/routes',
    createRouteRouter(services.routes ?? routeService, admin),
  );

  app.use(
    '/api/v1/trips',
    createTripRouter(
      services.trips ?? tripService,
      admin,
      services.tripSearch,
      services.tripDetails,
      services.tripBatches,
    ),
  );

  app.use(
    '/api/v1/bus-types',
    createBusTypeRouter(services.busTypes ?? busTypeService, admin),
  );
  app.use(
    '/api/v1/amenities',
    createAmenityRouter(services.amenities ?? amenityService, admin),
  );

  app.use('/api/v1/auth', createAuthRouter(services.auth ?? authService));
  app.use(
    '/api/v1/auth',
    createSessionRouter(services.sessions ?? sessionService, corsOrigins),
  );

  app.use(
    '/api/v1/auth',
    createPasswordResetRouter(services.passwordReset ?? passwordResetService),
  );

  app.use(
    '/api/v1/bookings',
    createBookingRouter(
      services.bookings ?? bookingService,
      services.sessions ?? sessionService,
    ),
  );

  app.use(
    '/api/v1/admin/bookings',
    createAdminBookingRouter(
      services.adminBookings ?? adminBookingService,
      admin,
    ),
  );

  app.use(
    '/api/v1/admin/users',
    createAdminUserRouter(services.adminUsers ?? adminUserService, admin),
  );

  app.use(
    '/api/v1/admin/admins',
    createAdministratorRouter(
      services.administrators ?? administratorService,
      superAdmin,
    ),
  );

  // This runs only if none of the routes above handled the request.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
