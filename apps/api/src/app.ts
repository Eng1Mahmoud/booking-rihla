import { createScheduledJobRouter } from './features/operations/scheduledJobRoutes.ts';
import { createAdminBusRouter } from './features/fleet/adminBusRoutes.ts';
import {
  adminBusService,
  type AdminBusService,
} from './features/fleet/adminBusService.ts';
import { createAdminFleetRouter } from './features/fleet/adminFleetRoutes.ts';
import {
  adminFleetService,
  type AdminFleetService,
} from './features/fleet/adminFleetService.ts';
import { createAdminCatalogRouter } from './features/catalog/adminCatalogRoutes.ts';
import {
  adminCatalogService,
  type AdminCatalogService,
} from './features/catalog/adminCatalogService.ts';
import { createAccountRouter } from './features/accounts/accountRoutes.ts';
import {
  accountPaymentService,
  type AccountPaymentService,
} from './features/accounts/accountPaymentService.ts';
import { sendSuccess, sendFailure } from './utils/apiResponse.ts';
import { createOperationRouter } from './features/operations/operationRoutes.ts';
import { requestLogger } from './middlewares/requestLogger.ts';
import {
  readinessService,
  type ReadinessService,
} from './infrastructure/health/readinessService.ts';
import { requestId } from './middlewares/requestId.ts';
import {
  adminPaymentStatisticsService,
  type AdminPaymentStatisticsService,
} from './features/payments/adminPaymentStatisticsService.ts';
import {
  adminStatisticsService,
  type AdminStatisticsService,
} from './features/reports/adminStatisticsService.ts';
import { createAdminStatisticsRouter } from './features/reports/adminStatisticsRoutes.ts';
import {
  ticketService,
  type TicketService,
} from './features/tickets/ticketService.ts';
import {
  adminPaymentService,
  type AdminPaymentService,
} from './features/payments/adminPaymentService.ts';
import { createAdminPaymentRouter } from './features/payments/adminPaymentRoutes.ts';
import {
  configuredPaymentCheckout,
  paymentCheckoutService,
  type PaymentCheckoutService,
} from './features/payments/paymentCheckoutService.ts';
import {
  paymentAttemptService,
  type PaymentAttemptService,
} from './features/payments/paymentAttemptService.ts';
import {
  paymobWebhookService,
  type PaymobWebhookService,
} from './features/payments/paymobWebhookService.ts';
import { createPaymobWebhookRouter } from './features/payments/paymobWebhookRoutes.ts';
import { createAssistantRouter } from './features/assistant/assistantRoutes.ts';

import {
  administratorService,
  type AdministratorService,
} from './features/administrators/administratorService.ts';
import { createAdministratorRouter } from './features/administrators/administratorRoutes.ts';
import {
  adminUserService,
  type AdminUserService,
} from './features/users/adminUserService.ts';
import { createAdminUserRouter } from './features/users/adminUserRoutes.ts';
import {
  adminBookingService,
  type AdminBookingService,
} from './features/bookings/adminBookingService.ts';
import { createAdminBookingRouter } from './features/bookings/adminBookingRoutes.ts';
import { createTicketScanRouter } from './features/tickets/ticketScanRoutes.ts';
import {
  ticketScanService,
  type TicketScanService,
} from './features/tickets/ticketScanService.ts';
import {
  tripBatchService,
  type TripBatchService,
} from './features/trips/tripBatchService.ts';
import {
  busTypeService,
  type BusTypeService,
} from './features/fleet/busTypeService.ts';
import {
  amenityService,
  type AmenityService,
} from './features/amenities/amenityService.ts';
import { createBusTypeRouter } from './features/fleet/busTypeRoutes.ts';
import { createAmenityRouter } from './features/amenities/amenityRoutes.ts';
import {
  bookingService,
  type BookingService,
} from './features/bookings/bookingService.ts';
import { createBookingRouter } from './features/bookings/bookingRoutes.ts';
import express from 'express';
import { requireAuth } from './middlewares/requireAuth.ts';
import { requireRole } from './middlewares/requireRole.ts';
import helmet from 'helmet';
import cors from 'cors';
import { AppError } from './errors/AppError.ts';
import { errorHandler } from './middlewares/errorHandler.ts';
import { createCityRouter } from './features/cities/cityRoutes.ts';
import {
  cityService,
  type CityService,
} from './features/cities/cityService.ts';
import {
  stationService,
  type StationService,
} from './features/stations/stationService.ts';
import { createStationRouter } from './features/stations/stationRoutes.ts';
import { busService, type BusService } from './features/buses/busService.ts';
import { createBusRouter } from './features/buses/busRoutes.ts';

import {
  routeService,
  type RouteService,
} from './features/routes/routeService.ts';
import { createRouteRouter } from './features/routes/routeRoutes.ts';

import { tripService, type TripService } from './features/trips/tripService.ts';
import { createTripRouter } from './features/trips/tripRoutes.ts';

import {
  tripSearchService,
  type TripSearchService,
} from './features/trips/tripSearchService.ts';

import {
  tripDetailsService,
  type TripDetailsService,
} from './features/trips/tripDetailsService.ts';

import { authService, type AuthService } from './features/auth/authService.ts';
import { createAuthRouter } from './features/auth/authRoutes.ts';

import {
  sessionService,
  type SessionService,
} from './features/auth/sessionService.ts';
import { createSessionRouter } from './features/auth/sessionRoutes.ts';

import {
  passwordResetService,
  type PasswordResetService,
} from './features/auth/passwordResetService.ts';
import { createPasswordResetRouter } from './features/auth/passwordResetRoutes.ts';

export function createApp(
  corsOrigins: string[],
  services: {
    readiness?: ReadinessService;
    adminCatalog?: AdminCatalogService;
    adminFleet?: AdminFleetService;
    adminBuses?: AdminBusService;
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
    accountPayments?: AccountPaymentService;
    passwordReset?: PasswordResetService;
    bookings?: BookingService;
    tickets?: TicketService;
    ticketScanning?: TicketScanService;
    adminBookings?: AdminBookingService;
    adminPayments?: AdminPaymentService;
    adminPaymentStatistics?: AdminPaymentStatisticsService;
    adminStatistics?: AdminStatisticsService;
    adminUsers?: AdminUserService;
    administrators?: AdministratorService;
    busTypes?: BusTypeService;
    amenities?: AmenityService;
    paymobWebhook?: PaymobWebhookService;
    paymentAttempts?: PaymentAttemptService;
    paymentCheckout?: PaymentCheckoutService;
  } = {},
) {
  const app = express();

  const sessions = services.sessions ?? sessionService;
  const authenticate = requireAuth(sessions);
  const admin = [authenticate, requireRole('ADMIN', 'SUPER_ADMIN')];
  const superAdmin = [authenticate, requireRole('SUPER_ADMIN')];
  const gateStaff = [
    authenticate,
    requireRole('STAFF', 'ADMIN', 'SUPER_ADMIN'),
  ];

  app.disable('x-powered-by');
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      exposedHeaders: ['X-Request-ID'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/ready', async (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (app.locals.stopping) {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
      return;
    }
    try {
      await (services.readiness ?? readinessService).check();
      sendSuccess(response, { status: 'ready' });
    } catch {
      sendFailure(response, 503, 'SERVICE_UNAVAILABLE');
    }
  });

  app.use('/api/v1/internal/jobs', createScheduledJobRouter());

  app.get('/api/v1/health', (_request, response) => {
    sendSuccess(response, { status: 'ok' });
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
      services.tripSearch ?? tripSearchService,
      services.tripDetails ?? tripDetailsService,
      services.tripBatches ?? tripBatchService,
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

  app.use(
    '/api/v1/admin',
    createAdminBusRouter(services.adminBuses ?? adminBusService, admin),
  );
  app.use(
    '/api/v1/admin',
    createAdminFleetRouter(services.adminFleet ?? adminFleetService, admin),
  );
  app.use(
    '/api/v1/admin',
    createAdminCatalogRouter(
      services.adminCatalog ?? adminCatalogService,
      admin,
    ),
  );
  app.use('/api/v1/admin', createOperationRouter(superAdmin));

  app.get('/api/v1/payments/availability', (_request, response) => {
    let checkoutEnabled = false;
    try {
      checkoutEnabled = configuredPaymentCheckout() !== null;
    } catch {
      /* Keep checkout closed for invalid settings. */
    }
    sendSuccess(response.set('Cache-Control', 'no-store'), { checkoutEnabled });
  });
  app.use(
    '/api/v1/account',
    createAccountRouter(
      services.accountPayments ?? accountPaymentService,
      sessions,
    ),
  );
  app.use('/api/v1/auth', createAuthRouter(services.auth ?? authService));
  app.use('/api/v1/auth', createSessionRouter(sessions, corsOrigins));

  app.use(
    '/api/v1/auth',
    createPasswordResetRouter(services.passwordReset ?? passwordResetService),
  );

  app.use(
    '/api/v1/bookings',
    createBookingRouter(
      services.bookings ?? bookingService,
      sessions,
      services.paymentAttempts ?? paymentAttemptService,
      services.paymentCheckout ?? paymentCheckoutService,
      services.tickets ?? ticketService,
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
    '/api/v1/admin/tickets',
    createTicketScanRouter(
      gateStaff,
      services.ticketScanning ?? ticketScanService,
    ),
  );

  app.use(
    '/api/v1/admin/statistics',
    createAdminStatisticsRouter(
      services.adminStatistics ?? adminStatisticsService,
      admin,
    ),
  );

  app.use(
    '/api/v1/admin/payments',
    createAdminPaymentRouter(
      services.adminPayments ?? adminPaymentService,
      admin,
      services.adminPaymentStatistics ?? adminPaymentStatisticsService,
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

  app.use(
    '/api/v1/payments/paymob',
    createPaymobWebhookRouter(services.paymobWebhook ?? paymobWebhookService),
  );

  app.use('/api/v1/assistant', createAssistantRouter());

  // This runs only if none of the routes above handled the request.
  app.use((_request, _response, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
  });

  // Error middleware must come after the routes and the not-found middleware.
  app.use(errorHandler);

  return app;
}
